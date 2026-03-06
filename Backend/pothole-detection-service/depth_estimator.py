"""
Depth Estimation Module
Uses MiDaS and DepthAnything models via Replicate API to estimate depth maps.
Compares results from both models and returns averaged/best result.
"""
import os
import base64
import time
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any
from enum import Enum

import cv2
import numpy as np
import requests

# Replicate API configuration
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")

# Model versions on Replicate
MIDAS_MODEL = "cjwbw/midas"  # MiDaS model (primary depth estimator)

# Replicate API endpoints
REPLICATE_API_URL = "https://api.replicate.com/v1/predictions"


class DepthModel(Enum):
    MIDAS = "midas"
    DEPTH_ANYTHING = "depth_anything"
    BOTH = "both"


@dataclass
class DepthEstimationResult:
    """Result from depth estimation"""
    success: bool
    depth_map: Optional[np.ndarray] = None  # Normalized depth map (0-1)
    depth_map_raw: Optional[np.ndarray] = None  # Raw depth values
    min_depth: float = 0.0
    max_depth: float = 0.0
    model_used: str = ""
    processing_time_ms: float = 0.0
    error: Optional[str] = None
    
    # If using both models
    midas_depth: Optional[np.ndarray] = None
    depth_anything_depth: Optional[np.ndarray] = None
    confidence_score: float = 0.0  # Agreement between models


class DepthEstimator:
    """
    Depth estimation using MiDaS and DepthAnything models.
    Can run both models and compare/average results.
    """
    
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or REPLICATE_API_TOKEN
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN is required. Set it as environment variable.")
        
        self.headers = {
            "Authorization": f"Token {self.api_token}",
            "Content-Type": "application/json"
        }
    
    def _image_to_base64(self, image_path: str) -> str:
        """Convert image file to base64 data URI"""
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        # Detect image type
        ext = os.path.splitext(image_path)[1].lower()
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp"
        }
        mime_type = mime_types.get(ext, "image/jpeg")
        
        b64_data = base64.b64encode(image_data).decode("utf-8")
        return f"data:{mime_type};base64,{b64_data}"
    
    def _call_replicate(self, model_id: str, image_uri: str, timeout: int = 300) -> Optional[Dict[str, Any]]:
        """Call Replicate API and wait for result (default 5 min for cold start)"""
        try:
            # Replicate supports two formats:
            # 1. Full version hash: "owner/model:abc123..."
            # 2. Model name only: "owner/model" (uses latest version)
            
            # First, get the latest version if not specified
            if ":" not in model_id:
                # Get model info to find latest version
                model_url = f"https://api.replicate.com/v1/models/{model_id}"
                model_response = requests.get(model_url, headers=self.headers, timeout=10)
                
                if model_response.status_code == 200:
                    model_info = model_response.json()
                    latest_version = model_info.get("latest_version", {}).get("id")
                    if latest_version:
                        model_id = f"{model_id}:{latest_version}"
                        print(f"   Using latest version: {model_id[:50]}...")
            
            # Create prediction
            payload = {
                "version": model_id.split(":")[-1] if ":" in model_id else model_id,
                "input": {
                    "image": image_uri
                }
            }
            
            response = requests.post(
                REPLICATE_API_URL,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 201:
                print(f"Replicate API error: {response.status_code} - {response.text}")
                return None
            
            prediction = response.json()
            prediction_id = prediction["id"]
            get_url = prediction["urls"]["get"]
            
            # Poll for result
            start_time = time.time()
            while time.time() - start_time < timeout:
                poll_response = requests.get(get_url, headers=self.headers, timeout=10)
                result = poll_response.json()
                
                status = result.get("status")
                if status == "succeeded":
                    return result
                elif status == "failed":
                    print(f"Replicate prediction failed: {result.get('error')}")
                    return None
                elif status == "canceled":
                    return None
                
                time.sleep(1)
            
            print("Replicate prediction timed out")
            return None
            
        except Exception as e:
            print(f"Replicate API exception: {e}")
            return None
    
    def _download_depth_map(self, url: str) -> Optional[np.ndarray]:
        """Download depth map image from URL and convert to numpy array"""
        try:
            response = requests.get(url, timeout=30)
            if response.status_code != 200:
                return None
            
            # Decode image
            nparr = np.frombuffer(response.content, np.uint8)
            depth_img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            
            if depth_img is None:
                return None
            
            # Normalize to 0-1
            depth_normalized = depth_img.astype(np.float32) / 255.0
            return depth_normalized
            
        except Exception as e:
            print(f"Error downloading depth map: {e}")
            return None
    
    def estimate_midas(self, image_path: str) -> DepthEstimationResult:
        """Run MiDaS depth estimation"""
        start_time = time.time()
        
        try:
            image_uri = self._image_to_base64(image_path)
            
            # Use MiDaS model on Replicate
            # Model: https://replicate.com/cjwbw/midas
            result = self._call_replicate(
                "cjwbw/midas",
                image_uri
            )
            
            if not result or not result.get("output"):
                return DepthEstimationResult(
                    success=False,
                    error="MiDaS prediction failed",
                    model_used="midas"
                )
            
            # Download depth map
            depth_url = result["output"]
            depth_map = self._download_depth_map(depth_url)
            
            if depth_map is None:
                return DepthEstimationResult(
                    success=False,
                    error="Failed to download MiDaS depth map",
                    model_used="midas"
                )
            
            processing_time = (time.time() - start_time) * 1000
            
            return DepthEstimationResult(
                success=True,
                depth_map=depth_map,
                min_depth=float(np.min(depth_map)),
                max_depth=float(np.max(depth_map)),
                model_used="midas",
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            return DepthEstimationResult(
                success=False,
                error=str(e),
                model_used="midas"
            )
    
    def estimate_depth_anything(self, image_path: str) -> DepthEstimationResult:
        """Run DepthAnything depth estimation"""
        start_time = time.time()
        
        try:
            image_uri = self._image_to_base64(image_path)
            
            # Use DepthAnything model on Replicate
            # Model: https://replicate.com/cjwbw/depth-anything
            result = self._call_replicate(
                "cjwbw/depth-anything",
                image_uri
            )
            
            if not result or not result.get("output"):
                return DepthEstimationResult(
                    success=False,
                    error="DepthAnything prediction failed",
                    model_used="depth_anything"
                )
            
            # Download depth map
            depth_url = result["output"]
            depth_map = self._download_depth_map(depth_url)
            
            if depth_map is None:
                return DepthEstimationResult(
                    success=False,
                    error="Failed to download DepthAnything depth map",
                    model_used="depth_anything"
                )
            
            processing_time = (time.time() - start_time) * 1000
            
            return DepthEstimationResult(
                success=True,
                depth_map=depth_map,
                min_depth=float(np.min(depth_map)),
                max_depth=float(np.max(depth_map)),
                model_used="depth_anything",
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            return DepthEstimationResult(
                success=False,
                error=str(e),
                model_used="depth_anything"
            )
    
    def estimate_both_and_compare(self, image_path: str) -> DepthEstimationResult:
        """
        Run both MiDaS and DepthAnything, compare results.
        Returns averaged depth map with confidence score.
        """
        start_time = time.time()
        
        # Run both models
        midas_result = self.estimate_midas(image_path)
        depth_anything_result = self.estimate_depth_anything(image_path)
        
        # Handle cases where one or both fail
        if not midas_result.success and not depth_anything_result.success:
            return DepthEstimationResult(
                success=False,
                error="Both depth estimation models failed",
                model_used="both"
            )
        
        if not midas_result.success:
            depth_anything_result.model_used = "depth_anything (midas failed)"
            return depth_anything_result
        
        if not depth_anything_result.success:
            midas_result.model_used = "midas (depth_anything failed)"
            return midas_result
        
        # Both succeeded - resize to same dimensions and compare
        midas_depth = midas_result.depth_map
        da_depth = depth_anything_result.depth_map
        
        # Resize to match (use larger dimensions)
        target_h = max(midas_depth.shape[0], da_depth.shape[0])
        target_w = max(midas_depth.shape[1], da_depth.shape[1])
        
        midas_resized = cv2.resize(midas_depth, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        da_resized = cv2.resize(da_depth, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        
        # Calculate correlation (confidence score)
        # Higher correlation = models agree more
        correlation = np.corrcoef(midas_resized.flatten(), da_resized.flatten())[0, 1]
        confidence = max(0.0, correlation)  # Clamp negative values
        
        # Average the depth maps
        averaged_depth = (midas_resized + da_resized) / 2.0
        
        # If models disagree significantly, use the one with more contrast (likely more accurate)
        if confidence < 0.7:
            midas_contrast = np.std(midas_resized)
            da_contrast = np.std(da_resized)
            
            if midas_contrast > da_contrast:
                selected_depth = midas_resized
                model_note = "midas (selected due to higher contrast)"
            else:
                selected_depth = da_resized
                model_note = "depth_anything (selected due to higher contrast)"
        else:
            selected_depth = averaged_depth
            model_note = "averaged (high agreement)"
        
        processing_time = (time.time() - start_time) * 1000
        
        return DepthEstimationResult(
            success=True,
            depth_map=selected_depth,
            min_depth=float(np.min(selected_depth)),
            max_depth=float(np.max(selected_depth)),
            model_used=model_note,
            processing_time_ms=processing_time,
            midas_depth=midas_resized,
            depth_anything_depth=da_resized,
            confidence_score=confidence
        )
    
    def estimate(self, image_path: str, model: DepthModel = DepthModel.BOTH) -> DepthEstimationResult:
        """
        Main entry point for depth estimation.
        
        Args:
            image_path: Path to the image file
            model: Which model(s) to use (MIDAS, DEPTH_ANYTHING, or BOTH)
        
        Returns:
            DepthEstimationResult with depth map and metadata
        """
        if model == DepthModel.MIDAS:
            return self.estimate_midas(image_path)
        elif model == DepthModel.DEPTH_ANYTHING:
            return self.estimate_depth_anything(image_path)
        else:
            return self.estimate_both_and_compare(image_path)


# HuggingFace Inference API alternative (backup)
class HuggingFaceDepthEstimator:
    """
    Alternative depth estimator using HuggingFace Inference API.
    Useful if Replicate is unavailable.
    """
    
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.getenv("HUGGINGFACE_API_TOKEN", "")
        self.headers = {"Authorization": f"Bearer {self.api_token}"}
        
        # Model endpoints
        self.midas_url = "https://api-inference.huggingface.co/models/Intel/dpt-large"
        self.depth_anything_url = "https://api-inference.huggingface.co/models/depth-anything/Depth-Anything-V2-Large"
    
    def estimate(self, image_path: str) -> DepthEstimationResult:
        """Run depth estimation using HuggingFace"""
        try:
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Try DepthAnything first (newer, more accurate)
            response = requests.post(
                self.depth_anything_url,
                headers=self.headers,
                data=image_data,
                timeout=60
            )
            
            if response.status_code == 200:
                # Response is the depth image
                nparr = np.frombuffer(response.content, np.uint8)
                depth_img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
                
                if depth_img is not None:
                    depth_normalized = depth_img.astype(np.float32) / 255.0
                    return DepthEstimationResult(
                        success=True,
                        depth_map=depth_normalized,
                        min_depth=float(np.min(depth_normalized)),
                        max_depth=float(np.max(depth_normalized)),
                        model_used="huggingface_depth_anything"
                    )
            
            # Fallback to MiDaS
            response = requests.post(
                self.midas_url,
                headers=self.headers,
                data=image_data,
                timeout=60
            )
            
            if response.status_code == 200:
                nparr = np.frombuffer(response.content, np.uint8)
                depth_img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
                
                if depth_img is not None:
                    depth_normalized = depth_img.astype(np.float32) / 255.0
                    return DepthEstimationResult(
                        success=True,
                        depth_map=depth_normalized,
                        min_depth=float(np.min(depth_normalized)),
                        max_depth=float(np.max(depth_normalized)),
                        model_used="huggingface_midas"
                    )
            
            return DepthEstimationResult(
                success=False,
                error=f"HuggingFace API error: {response.status_code}",
                model_used="huggingface"
            )
            
        except Exception as e:
            return DepthEstimationResult(
                success=False,
                error=str(e),
                model_used="huggingface"
            )
