import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import torch
import io
import onnxruntime as ort
from PIL import Image
import os

class VirtualTryOnProcessor:
    def __init__(self):
        # Path to models
        base_path = os.path.dirname(__file__)
        pose_model_path = os.path.join(base_path, 'pose_landmarker.task')
        tom_model_path = os.path.join(base_path, 'cp_vton_tom.onnx')
        self.studio_bg_path = os.path.join(base_path, 'studio_bg.jpg')
        
        # Initialize Pose Landmarker
        base_options = python.BaseOptions(model_asset_path=pose_model_path)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            output_segmentation_masks=True
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

        # Initialize GAN (TOM - Try-On Module)
        # Using CPU for better compatibility on general host
        try:
            self.gan = ort.InferenceSession(tom_model_path, providers=['CPUExecutionProvider'])
            self.has_gan = True
        except Exception as e:
            print(f"Warning: GAN initialization failed: {e}")
            self.has_gan = False

    def get_agnostic(self, img, landmarks, mask):
        """Creates an 'agnostic' image where the body part to be covered is blurred/removed."""
        h, w = img.shape[:2]
        # In CP-VTON, the torso area is usually blurred or cleared
        agnostic = img.copy()
        
        # Create a rough bounding box for the torso using landmarks
        # Shoulders (11, 12), Hips (23, 24)
        ls = landmarks[11]
        rs = landmarks[12]
        lh = landmarks[23]
        rh = landmarks[24]
        
        torso_pts = np.array([
            [ls.x * w, ls.y * h], [rs.x * w, rs.y * h],
            [rh.x * w, rh.y * h], [lh.x * w, lh.y * h]
        ], dtype=np.int32)
        
        # Expand slightly and blur
        agnostic_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(agnostic_mask, [torso_pts], 255)
        # Dilate to cover more area
        kernel = np.ones((20, 20), np.uint8)
        agnostic_mask = cv2.dilate(agnostic_mask, kernel, iterations=2)
        
        # Apply blur to torso
        img_blur = cv2.GaussianBlur(agnostic, (101, 101), 0)
        agnostic[agnostic_mask > 0] = img_blur[agnostic_mask > 0]
        
        return agnostic

    def extract_stats(self, landmarks, h, w):
        """Extracts measurements and recommends size."""
        # 1. Measurements (in pixels, then relative)
        # Shoulders (11, 12), Hips (23, 24), Height (approx from Nose to Ankles)
        ls, rs = landmarks[11], landmarks[12]
        lh, rh = landmarks[23], landmarks[24]
        ank_l, ank_r = landmarks[27], landmarks[28]
        
        sw = np.sqrt((ls.x - rs.x)**2 + (ls.y - rs.y)**2) * w
        hw = np.sqrt((lh.x - rh.x)**2 + (lh.y - rh.y)**2) * w
        # Body height estimate
        bh = np.sqrt((landmarks[0].x - (ank_l.x + ank_r.x)/2)**2 + (landmarks[0].y - (ank_l.y + ank_r.y)/2)**2) * h
        
        ratio = sw / bh # Shoulder to Height Ratio
        
        # Mapping to sizes based on standard proportions
        if ratio > 0.35: size = "XL"
        elif ratio > 0.30: size = "L"
        elif ratio > 0.25: size = "M"
        else: size = "S"
        
        return {
            "shoulder_width": f"{int(sw/10)}cm", # Scaled roughly
            "recommended_size": size,
            "fit_score": "High Confidence" if landmarks[0].visibility > 0.8 else "Medium Confidence"
        }

    def replace_studio_bg(self, img, mask):
        """Replaces the background with a studio preset."""
        if not os.path.exists(self.studio_bg_path):
            return img
            
        bg = cv2.imread(self.studio_bg_path)
        if bg is None: return img
        
        bg = cv2.resize(bg, (img.shape[1], img.shape[0]))
        
        # Soften mask edges for seamless blending
        mask_soft = cv2.GaussianBlur(mask.astype(np.float32), (15, 15), 0) / 255.0
        mask_soft = mask_soft[:, :, np.newaxis]
        
        # Blend: Person * Mask + BG * (1 - Mask)
        result = (img * mask_soft + bg * (1 - mask_soft)).astype(np.uint8)
        return result

    def get_pose_heatmap(self, landmarks, h, w):
        """Generates 18-channel heatmap for joints (CP-VTON/OpenPose format)."""
        # Mapping MP to 18 OpenPose points
        points = []
        # Neck is midpoint of shoulders
        neck = [(landmarks[11].x + landmarks[12].x) / 2, (landmarks[11].y + landmarks[12].y) / 2]
        
        # Joints in CP-VTON order: 0:Nose, 1:Neck, 2-7:Arms, 8-13:Legs, 14-17:Eyes/Ears
        mp_indices = [
            0, # Nose
            -1, # Neck (computed)
            12, 14, 16, # R Arm
            11, 13, 15, # L Arm
            24, 26, 28, # R Leg
            23, 25, 27, # L Leg
            5, 2, 8, 7 # Eyes/Ears
        ]
        
        heatmap = np.zeros((18, h, w), dtype=np.float32)
        sigma = 6
        
        for i, idx in enumerate(mp_indices):
            if idx == -1: # Neck
                px, py = neck[0] * w, neck[1] * h
            else:
                lm = landmarks[idx]
                px, py = lm.x * w, lm.y * h
            
            # Simple gaussian dot
            x = np.arange(0, w, 1, float)
            y = np.arange(0, h, 1, float)
            y = y[:, np.newaxis]
            heatmap[i] = np.exp(-((x - px)**2 + (y - py)**2) / (2 * sigma**2))
            
        return heatmap

    def preprocess_cloth(self, cloth_img):
        """Crops the cloth image to the actual garment and removes white background if needed."""
        # Convert to gray to find the foreground
        if cloth_img.shape[2] == 4:
            # Use alpha channel if present
            alpha = cloth_img[:, :, 3]
            mask = (alpha > 0).astype(np.uint8) * 255
        else:
            # Detect white background
            gray = cv2.cvtColor(cloth_img, cv2.COLOR_BGR2GRAY)
            # Threshold to find non-white areas (assuming white background)
            _, mask = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY_INV)
            # Also remove very dark pixels if they are background (optional but helpful)
            _, mask2 = cv2.threshold(gray, 5, 255, cv2.THRESH_BINARY)
            mask = cv2.bitwise_and(mask, mask2)
        
        # Find contours to get bounding box
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            # Filter by area to avoid noise
            valid_contours = [c for c in contours if cv2.contourArea(c) > 500]
            if not valid_contours: return cloth_img
            
            # Combine all valid contours to get a single bounding box
            all_pts = np.concatenate(valid_contours)
            x, y, w, h = cv2.boundingRect(all_pts)
            
            # Crop
            cropped_cloth = cloth_img[y:y+h, x:x+w]
            cropped_mask = mask[y:y+h, x:x+w]
            
            # If 3 channel, add alpha channel based on mask to enable transparent warping
            if cropped_cloth.shape[2] == 3:
                # Use the mask to create a transparent background
                b, g, r = cv2.split(cropped_cloth)
                cropped_cloth = cv2.merge([b, g, r, cropped_mask])
            
            return cropped_cloth
        return cloth_img

    def process_try_on(self, person_image_bytes, cloth_image_bytes):
        # --- ATTEMPT 1: State-of-the-Art HuggingFace API ---
        api_spaces = ["yisol/IDM-VTON", "jallenjia/Change-Clothes-AI"]
        
        try:
            from gradio_client import Client, handle_file
            import tempfile
            
            # Save bytes to temp files for gradio client
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as p_tmp:
                p_tmp.write(person_image_bytes)
                person_path = p_tmp.name
                
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as c_tmp:
                c_tmp.write(cloth_image_bytes)
                cloth_path = c_tmp.name

            for space_name in api_spaces:
                try:
                    print(f"Attempting high-accuracy IDM-VTON via {space_name}...")
                    client = Client(space_name)
                    
                    # Prepare arguments
                    kwargs = {
                        "dict": {"background": handle_file(person_path), "layers": [], "composite": None},
                        "garm_img": handle_file(cloth_path),
                        "garment_des": "A top",
                        "is_checked": True,
                        "is_checked_crop": False,
                        "denoise_steps": 30,
                        "seed": 42,
                        "api_name": "/tryon"
                    }
                    
                    # Category is required for jallenjia
                    if "jallenjia" in space_name:
                        kwargs["category"] = "upper_body"

                    result = client.predict(**kwargs)
                    
                    # The result is a tuple, index 0 contains the URL/path to the output image
                    output_path = result[0]
                    with open(output_path, "rb") as f:
                        output_bytes = f.read()
                        
                    # Cleanup
                    os.remove(person_path)
                    os.remove(cloth_path)
                    
                    print(f"Successfully processed via {space_name}!")
                    return output_bytes, None
                    
                except Exception as api_err:
                    print(f"API {space_name} failed: {api_err}")
            
            # If we reach here, all APIs failed
            print("All HuggingFace APIs failed or timed out.")
            if os.path.exists(person_path): os.remove(person_path)
            if os.path.exists(cloth_path): os.remove(cloth_path)
            
        except Exception as setup_err:
            print(f"API Setup failed: {setup_err}")

        print("Falling back to absolute local geometric + neural processing...")
            
        # --- ATTEMPT 2: Local CP-VTON / OpenCV Fallback ---
        # 1. Load Images
        person_img = cv2.imdecode(np.frombuffer(person_image_bytes, np.uint8), cv2.IMREAD_COLOR)
        cloth_raw = cv2.imdecode(np.frombuffer(cloth_image_bytes, np.uint8), cv2.IMREAD_UNCHANGED)
        if person_img is None or cloth_raw is None: return None, "Invalid image data"

        # Auto-crop the cloth to the actual garment
        cloth_img = self.preprocess_cloth(cloth_raw)

        h, w = person_img.shape[:2]
        
        # 2. Detect Pose and Mask
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB))
        results = self.detector.detect(mp_image)
        if not results.pose_landmarks: return None, "No landmarks detected"
        landmarks = results.pose_landmarks[0]
        
        # 3. Warping (Using our robust OpenCV logic for the GMM stage)
        # Standard input for GAN is 192x256
        GAN_W, GAN_H = 192, 256
        
        # Warp points (Shoulders and Hips)
        p_ls = np.array([landmarks[11].x * w, landmarks[11].y * h])
        p_rs = np.array([landmarks[12].x * w, landmarks[12].y * h])
        p_lh = np.array([landmarks[23].x * w, landmarks[23].y * h])
        p_rh = np.array([landmarks[24].x * w, landmarks[24].y * h])
        
        shoulder_mid = (p_ls + p_rs) / 2
        hip_mid = (p_lh + p_rh) / 2
        torso_vec = hip_mid - shoulder_mid
        sw_vec = p_rs - p_ls
        
        # Widen the drape for a more realistic, looser fit covering the torso properly
        dst_pts = np.float32([
            p_ls - 0.15*sw_vec + 0.05*torso_vec, p_rs + 0.15*sw_vec + 0.05*torso_vec,
            p_rh + 0.2*sw_vec + 0.15*torso_vec, p_lh - 0.2*sw_vec + 0.15*torso_vec
        ])
        src_pts = np.float32([[0, 0], [cloth_img.shape[1], 0], [cloth_img.shape[1], cloth_img.shape[0]], [0, cloth_img.shape[0]]])
        
        matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
        warped_cloth = cv2.warpPerspective(cloth_img, matrix, (w, h))

        # 4. GAN Refinement (TOM)
        try:
            if self.has_gan and results.segmentation_masks:
                # Resize all to 192x256
                agnostic = self.get_agnostic(person_img, landmarks, results.segmentation_masks[0])
                agnostic_res = cv2.resize(agnostic, (GAN_W, GAN_H)) / 127.5 - 1.0 # Normalization
                
                pose_heatmap = self.get_pose_heatmap(landmarks, GAN_H, GAN_W)
                
                # Prepare warped cloth and mask
                if warped_cloth.shape[2] == 4:
                    cloth_bgr = warped_cloth[:, :, :3]
                    cloth_mask = (warped_cloth[:, :, 3] > 0).astype(np.float32)
                else:
                    cloth_bgr = warped_cloth
                    # Create a mask based on non-black pixels if no alpha channel exists
                    cloth_mask = (cv2.cvtColor(warped_cloth, cv2.COLOR_BGR2GRAY) > 10).astype(np.float32)

                warped_cloth_res = cv2.resize(cloth_bgr, (GAN_W, GAN_H)) / 127.5 - 1.0
                warped_mask_res = cv2.resize(cloth_mask, (GAN_W, GAN_H))
                warped_mask_res = warped_mask_res[np.newaxis, :, :] # 1xHxW
                
                # Combine into 25-channel input: Agnostic(3) + Pose(18) + Cloth(3) + Mask(1) = 25
                input_tensor = np.concatenate([
                    agnostic_res.transpose(2, 0, 1), # 3xHxW
                    pose_heatmap,                    # 18xHxW
                    warped_cloth_res.transpose(2, 0, 1), # 3xHxW
                    warped_mask_res                  # 1xHxW
                ], axis=0).astype(np.float32)
                input_tensor = input_tensor[np.newaxis, :, :, :] # [1, 25, 256, 192]
                
                # RUN GAN
                ort_inputs = {self.gan.get_inputs()[0].name: input_tensor}
                ort_outs = self.gan.run(None, ort_inputs)
                gan_result_raw = ort_outs[0][0] # [3, 256, 192]
                
                # Denormalize and resize back
                gan_result = ((gan_result_raw.transpose(1, 2, 0) + 1.0) * 127.5).clip(0, 255).astype(np.uint8)
                gan_result = cv2.resize(gan_result, (w, h))
                
                # Blend GAN result with original image (preserving head and arms)
                p_mask = cv2.resize((results.segmentation_masks[0].numpy_view() > 0.5).astype(np.uint8) * 255, (w, h))
                final_img = person_img.copy()
                # Apply GAN only on the masked person region
                final_img[p_mask > 0] = gan_result[p_mask > 0]
            else:
                raise Exception("Missing GAN or segmentation masks")
        except Exception as e:
            print(f"GAN failed, falling back to enhanced OpenCV blending: {e}")
            final_img = person_img.copy()
            p_mask = cv2.resize((results.segmentation_masks[0].numpy_view() > 0.5).astype(np.uint8) * 255, (w, h)) if results.segmentation_masks else np.ones((h,w), np.uint8)*255

            # Always ensure warped_cloth is 3-channel BGR for blending
            if warped_cloth.shape[2] == 4:
                cloth_bgr = warped_cloth[:, :, :3].copy()
                cloth_alpha_ch = warped_cloth[:, :, 3]
            else:
                cloth_bgr = warped_cloth.copy()
                cloth_alpha_ch = (cv2.cvtColor(warped_cloth, cv2.COLOR_BGR2GRAY) > 10).astype(np.uint8) * 255

            combined_mask = cv2.bitwise_and(cloth_alpha_ch, p_mask)
            kernel = np.ones((3, 3), np.uint8)
            eroded_mask = cv2.erode(combined_mask, kernel, iterations=1)

            y_idx, x_idx = np.where(eroded_mask > 0)
            if len(y_idx) > 0 and len(x_idx) > 0:
                center = (int(np.mean(x_idx)), int(np.mean(y_idx)))
                try:
                    final_img = cv2.seamlessClone(cloth_bgr, final_img, eroded_mask, center, cv2.MIXED_CLONE)
                except Exception as clone_err:
                    print(f"Seamless cloning failed, using alpha blend: {clone_err}")
                    cloth_alpha = (eroded_mask / 255.0)
                    for c in range(3):
                        final_img[:, :, c] = (cloth_alpha * cloth_bgr[:, :, c] + (1 - cloth_alpha) * final_img[:, :, c]).astype(np.uint8)
            else:
                print("Empty mask, skipping garment placement")

        # 5. Extract Stats
        try:
            stats = self.extract_stats(landmarks, h, w)
        except Exception as e:
            print(f"Stats failed: {e}")
            stats = {"recommended_size": "M", "fit_score": "Standard"}

        _, encoded_img = cv2.imencode('.jpg', final_img)
        return encoded_img.tobytes(), stats

processor = VirtualTryOnProcessor()
