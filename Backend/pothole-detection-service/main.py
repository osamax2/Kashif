"""
YOLOv8 Pothole Detection API
FastAPI service for pothole detection and automatic report generation
Uses Roboflow's pretrained model for better accuracy
"""
import json
import os
from datetime import datetime
from typing import List, Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from config import settings
from roboflow_detector import RoboflowPotholeDetector
from heic_processor import extract_metadata, process_heic_image
from processor import ImageProcessor, process_images_from_cli
from report_generator import ReportGenerator

# Initialize FastAPI app
app = FastAPI(
    title="Kashif Pothole Detection Service",
    description="Pothole detection with Roboflow pretrained YOLOv8 model",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global processor instance
processor: Optional[ImageProcessor] = None


class DetectionResponse(BaseModel):
    """Response model for detection results"""
    success: bool
    message: str
    num_potholes: int = 0
    max_severity: Optional[str] = None
    detections: list = []
    gps: Optional[dict] = None
    report_id: Optional[int] = None
    processing_time_ms: float = 0


class BatchProcessingResponse(BaseModel):
    """Response model for batch processing"""
    success: bool
    total_images: int
    successful: int
    failed: int
    total_potholes: int
    reports_created: int
    processing_time_seconds: float


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    pending_images: int
    timestamp: str


@app.on_event("startup")
async def startup_event():
    """Initialize components on startup"""
    global processor
    
    print("🚀 Starting Pothole Detection Service...")
    
    # Create directories
    os.makedirs(settings.IMAGES_DIR, exist_ok=True)
    os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    
    # Initialize processor (will lazy-load model)
    processor = ImageProcessor()
    
    print("✅ Service ready")


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    pending = processor.list_pending_images() if processor else []
    
    return HealthResponse(
        status="healthy",
        model_loaded=True,  # Roboflow API always available
        pending_images=len(pending),
        timestamp=datetime.now().isoformat()
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Alias for health check"""
    return await health_check()


@app.post("/detect", response_model=DetectionResponse)
async def detect_from_upload(
    file: UploadFile = File(...),
    create_report: bool = Query(True, description="Create report in reporting-service")
):
    """
    Upload an image and detect potholes.
    Supports HEIC, JPEG, PNG formats.
    """
    global processor
    
    if not processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    # Check file extension
    filename = file.filename.lower()
    allowed_extensions = {'.heic', '.heif', '.jpg', '.jpeg', '.png'}
    ext = os.path.splitext(filename)[1]
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {allowed_extensions}"
        )
    
    try:
        # Save uploaded file
        upload_path = os.path.join(settings.IMAGES_DIR, file.filename)
        with open(upload_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process the image
        result = processor.process_image(
            upload_path,
            create_report=create_report,
            move_after_processing=True
        )
        
        if not result.success:
            return DetectionResponse(
                success=False,
                message=result.error_message or "Processing failed",
                processing_time_ms=result.processing_time_seconds * 1000
            )
        
        # Build response
        gps_data = None
        if result.metadata and result.metadata.gps:
            gps_data = result.metadata.gps.to_dict()
        
        detections = []
        if result.detection_result:
            detections = [d.to_dict() for d in result.detection_result.detections]
        
        report_id = None
        if result.report and result.report.success:
            report_id = result.report.report_id
        
        return DetectionResponse(
            success=True,
            message=f"Detected {result.detection_result.num_potholes if result.detection_result else 0} pothole(s)",
            num_potholes=result.detection_result.num_potholes if result.detection_result else 0,
            max_severity=result.detection_result.max_severity if result.detection_result else None,
            detections=detections,
            gps=gps_data,
            report_id=report_id,
            processing_time_ms=result.processing_time_seconds * 1000
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-directory", response_model=BatchProcessingResponse)
async def process_directory(
    background_tasks: BackgroundTasks,
    directory: Optional[str] = Query(None, description="Directory path (default: /app/images)"),
    create_reports: bool = Query(True, description="Create reports for detected potholes")
):
    """
    Process all images in a directory.
    Runs in background and returns immediately.
    """
    global processor
    
    if not processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    target_dir = directory or settings.IMAGES_DIR
    
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail=f"Directory not found: {target_dir}")
    
    # Get list of pending images
    pending = processor.list_pending_images(target_dir)
    
    if not pending:
        return BatchProcessingResponse(
            success=True,
            total_images=0,
            successful=0,
            failed=0,
            total_potholes=0,
            reports_created=0,
            processing_time_seconds=0
        )
    
    # Process synchronously for now (could be made async)
    result = processor.process_directory(
        target_dir,
        create_reports=create_reports,
        move_after_processing=True
    )
    
    return BatchProcessingResponse(
        success=True,
        total_images=result.total_images,
        successful=result.successful,
        failed=result.failed,
        total_potholes=result.total_potholes_detected,
        reports_created=result.reports_created,
        processing_time_seconds=result.processing_time_seconds
    )


@app.get("/pending")
async def list_pending():
    """List all images pending processing"""
    global processor
    
    if not processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    pending = processor.list_pending_images()
    
    return {
        "count": len(pending),
        "images": [os.path.basename(p) for p in pending]
    }


@app.get("/output/{filename}")
async def get_output_file(filename: str):
    """Download an output/annotated image"""
    file_path = os.path.join(settings.OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)


@app.post("/load-model")
async def load_model():
    """Manually trigger model loading - not needed with Roboflow API"""
    return {
        "success": True,
        "model": "Roboflow pretrained pothole-detection-yolo-v8",
        "note": "Using Roboflow API - no local model loading required"
    }


@app.get("/stats")
async def get_stats():
    """Get processing statistics"""
    # Count files in each directory
    pending = len(os.listdir(settings.IMAGES_DIR)) if os.path.exists(settings.IMAGES_DIR) else 0
    processed = len(os.listdir(settings.PROCESSED_DIR)) if os.path.exists(settings.PROCESSED_DIR) else 0
    outputs = len(os.listdir(settings.OUTPUT_DIR)) if os.path.exists(settings.OUTPUT_DIR) else 0
    
    return {
        "pending_images": pending,
        "processed_images": processed,
        "output_files": outputs,
        "images_directory": settings.IMAGES_DIR,
        "processed_directory": settings.PROCESSED_DIR,
        "output_directory": settings.OUTPUT_DIR
    }


class AnalyzeResponse(BaseModel):
    """Response model for analyze-only endpoint"""
    success: bool
    message: str
    num_potholes: int = 0
    max_severity: Optional[str] = None
    ai_description: Optional[str] = None
    ai_description_ar: Optional[str] = None
    ai_description_ku: Optional[str] = None
    detections: list = []
    annotated_image_base64: Optional[str] = None  # Base64 encoded annotated image
    processing_time_ms: float = 0


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image_only(
    file: UploadFile = File(...)
):
    """
    Analyze an image for potholes WITHOUT creating a report.
    Returns AI-generated description and annotated image for the existing report.
    Used by reporting-service when user uploads a photo.
    """
    global processor
    
    if not processor:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    # Check file extension
    filename = file.filename.lower()
    allowed_extensions = {'.heic', '.heif', '.jpg', '.jpeg', '.png'}
    ext = os.path.splitext(filename)[1]
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {allowed_extensions}"
        )
    
    try:
        import time
        import cv2
        import base64
        start_time = time.time()
        
        # Save uploaded file temporarily
        temp_path = os.path.join(settings.IMAGES_DIR, f"temp_{file.filename}")
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Use RoboflowPotholeDetector directly
        detector = RoboflowPotholeDetector()
        
        # Convert HEIC if needed
        if ext in {'.heic', '.heif'}:
            from heic_processor import process_heic_image
            jpeg_path = temp_path.replace(ext, '.jpg')
            process_heic_image(temp_path, jpeg_path)
            detect_path = jpeg_path
        else:
            detect_path = temp_path
        
        # Run detection with annotated image
        result = detector.detect(detect_path, save_annotated=True, output_dir=settings.OUTPUT_DIR)
        
        processing_time = (time.time() - start_time) * 1000
        
        # Read and encode annotated image if available
        annotated_base64 = None
        if result and result.annotated_image_path and os.path.exists(result.annotated_image_path):
            with open(result.annotated_image_path, 'rb') as img_file:
                annotated_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            # Clean up annotated image after encoding
            os.remove(result.annotated_image_path)
        
        # Clean up temp files
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if ext in {'.heic', '.heif'} and os.path.exists(detect_path):
            os.remove(detect_path)
        
        if not result or result.num_potholes == 0:
            return AnalyzeResponse(
                success=True,
                message="No potholes detected",
                num_potholes=0,
                processing_time_ms=processing_time
            )
        
        # Generate AI description
        num_potholes = result.num_potholes
        max_severity = result.max_severity or "MEDIUM"
        
        # Create detailed description based on detections
        severity_map = {"LOW": "minor", "MEDIUM": "moderate", "HIGH": "severe"}
        severity_ar_map = {"LOW": "خفيفة", "MEDIUM": "متوسطة", "HIGH": "شديدة"}
        severity_ku_map = {"LOW": "sivik", "MEDIUM": "navncî", "HIGH": "giran"}
        
        severity_text = severity_map.get(max_severity, "moderate")
        severity_ar = severity_ar_map.get(max_severity, "متوسطة")
        severity_ku = severity_ku_map.get(max_severity, "navncî")
        
        # Calculate average size if available
        avg_width = sum(d.estimated_width_cm or 0 for d in result.detections) / max(len(result.detections), 1)
        avg_area = sum(d.estimated_area_cm2 or 0 for d in result.detections) / max(len(result.detections), 1)
        
        if num_potholes == 1:
            ai_description = f"AI detected 1 {severity_text} pothole"
            ai_description_ar = f"الذكاء الاصطناعي اكتشف حفرة واحدة {severity_ar}"
            ai_description_ku = f"Zîrekiya destkirdî 1 çalêka {severity_ku} dît"
        else:
            ai_description = f"AI detected {num_potholes} potholes with {severity_text} severity"
            ai_description_ar = f"الذكاء الاصطناعي اكتشف {num_potholes} حفر بخطورة {severity_ar}"
            ai_description_ku = f"Zîrekiya destkirdî {num_potholes} çalê bi giraniya {severity_ku} dît"
        
        if avg_width > 0:
            ai_description += f". Estimated average size: {avg_width:.0f}cm"
            ai_description_ar += f". الحجم التقديري: {avg_width:.0f}سم"
            ai_description_ku += f". Mezinahiya texmînî: {avg_width:.0f}cm"
        
        if avg_area > 0:
            ai_description += f", area: {avg_area:.0f}cm²"
            ai_description_ar += f", المساحة: {avg_area:.0f}سم²"
            ai_description_ku += f", rûber: {avg_area:.0f}cm²"
        
<<<<<<< HEAD
=======
        # Add YOLOv8 attribution text
        ai_description += "\n\n⚠️ This report was automatically created by the smart detection system (YOLOv8)"
        ai_description_ar += "\n\n⚠️ تم إنشاء هذا التقرير تلقائياً بواسطة نظام الكشف الذكي (YOLOv8)"
        ai_description_ku += "\n\n⚠️ Ev rapor bi awayekî otomatîk ji hêla pergala vedîtina jîr (YOLOv8) ve hatiye afirandin"
        
>>>>>>> feature/Ku_feature
        detections = [d.to_dict() for d in result.detections]
        
        return AnalyzeResponse(
            success=True,
            message=f"Detected {num_potholes} pothole(s)",
            num_potholes=num_potholes,
            max_severity=max_severity,
            ai_description=ai_description,
            ai_description_ar=ai_description_ar,
            ai_description_ku=ai_description_ku,
            detections=detections,
            annotated_image_base64=annotated_base64,
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        # Clean up on error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


<<<<<<< HEAD
=======
class EnhancedAnalyzeResponse(BaseModel):
    """Response model for enhanced analysis with depth estimation"""
    success: bool
    message: str
    num_potholes: int = 0
    max_severity: Optional[str] = None
    ai_description: Optional[str] = None
    ai_description_ar: Optional[str] = None
    ai_description_ku: Optional[str] = None
    detections: list = []
    annotated_image_base64: Optional[str] = None
    depth_map_base64: Optional[str] = None
    depth_estimation: Optional[dict] = None
    enhanced_dimensions: Optional[list] = None
    processing_time_ms: float = 0


@app.post("/analyze-enhanced", response_model=EnhancedAnalyzeResponse)
async def analyze_with_depth(
    file: UploadFile = File(...),
    use_both_depth_models: bool = Query(False, description="Use only MiDaS depth model"),
    detect_reference_object: bool = Query(True, description="Try to detect reference objects for calibration")
):
    """
    Enhanced pothole analysis with depth estimation.
    
    Uses MiDaS and/or DepthAnything models to estimate depth maps,
    then calculates real-world dimensions (width, length, depth, volume).
    
    Optionally detects reference objects (credit card, smartphone) for calibration.
    
    Requires REPLICATE_API_TOKEN environment variable for depth estimation.
    """
    import time
    import base64
    start_time = time.time()
    
    # Check file extension
    filename = file.filename.lower()
    allowed_extensions = {'.heic', '.heif', '.jpg', '.jpeg', '.png'}
    ext = os.path.splitext(filename)[1]
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {allowed_extensions}"
        )
    
    try:
        # Save uploaded file temporarily
        temp_path = os.path.join(settings.IMAGES_DIR, f"enhanced_{file.filename}")
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Convert HEIC if needed
        if ext in {'.heic', '.heif'}:
            from heic_processor import process_heic_image
            jpeg_path = temp_path.replace(ext, '.jpg')
            process_heic_image(temp_path, jpeg_path)
            detect_path = jpeg_path
        else:
            detect_path = temp_path
        
        # Try to use enhanced detector
        replicate_token = os.getenv("REPLICATE_API_TOKEN")
        
        if replicate_token:
            from enhanced_detector import create_enhanced_detector, DepthModel
            
            detector = create_enhanced_detector(
                replicate_token=replicate_token,
                use_both_models=use_both_depth_models
            )
            detector.enable_reference = detect_reference_object
            
            result = detector.detect(
                detect_path,
                save_annotated=True,
                save_depth_map=True,
                output_dir=settings.OUTPUT_DIR
            )
            
            # Read and encode annotated image
            annotated_base64 = None
            if result.base_result.annotated_image_path and os.path.exists(result.base_result.annotated_image_path):
                with open(result.base_result.annotated_image_path, 'rb') as img_file:
                    annotated_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                os.remove(result.base_result.annotated_image_path)
            
            # Read and encode depth map
            depth_map_base64 = None
            if result.depth_map_path and os.path.exists(result.depth_map_path):
                with open(result.depth_map_path, 'rb') as img_file:
                    depth_map_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                os.remove(result.depth_map_path)
            
            # Prepare response
            result_dict = result.to_dict()
            processing_time = (time.time() - start_time) * 1000
            
            # Generate AI description with dimensions
            num_potholes = result.base_result.num_potholes
            max_severity = result.base_result.max_severity or "MEDIUM"
            
            if num_potholes > 0 and result.dimensions:
                dims = result.dimensions[0]  # Primary pothole
                severity_map = {"LOW": "minor", "MEDIUM": "moderate", "HIGH": "severe"}
                severity_ar_map = {"LOW": "خفيفة", "MEDIUM": "متوسطة", "HIGH": "شديدة"}
                severity_ku_map = {"LOW": "sivik", "MEDIUM": "navncî", "HIGH": "giran"}
                
                severity_text = severity_map.get(max_severity, "moderate")
                severity_ar = severity_ar_map.get(max_severity, "متوسطة")
                severity_ku = severity_ku_map.get(max_severity, "navncî")
                
                ai_description = (
                    f"AI detected {num_potholes} {severity_text} pothole(s). "
                    f"Dimensions: {dims.width_cm}cm × {dims.length_cm}cm, "
                    f"depth: {dims.depth_cm}cm, volume: {dims.volume_cm3}cm³. "
                    f"Calibration: {dims.calibration_method} ({dims.confidence:.0%} confidence)."
                )
                ai_description_ar = (
                    f"الذكاء الاصطناعي اكتشف {num_potholes} حفرة {severity_ar}. "
                    f"الأبعاد: {dims.width_cm}سم × {dims.length_cm}سم، "
                    f"العمق: {dims.depth_cm}سم، الحجم: {dims.volume_cm3}سم³."
                )
                ai_description_ku = (
                    f"Zîrekiya destkirdî {num_potholes} çalêka {severity_ku} dît. "
                    f"Pîvan: {dims.width_cm}cm × {dims.length_cm}cm, "
                    f"kûrahî: {dims.depth_cm}cm, qebareya: {dims.volume_cm3}cm³."
                )
                
                ai_description += "\n\n⚠️ Enhanced analysis with depth estimation (MiDaS + DepthAnything)"
                ai_description_ar += "\n\n⚠️ تحليل محسّن مع تقدير العمق (MiDaS + DepthAnything)"
                ai_description_ku += "\n\n⚠️ Analîza pêşkeftî bi texmînkirina kûrahiyê (MiDaS + DepthAnything)"
            else:
                ai_description = "No potholes detected"
                ai_description_ar = "لم يتم اكتشاف حفر"
                ai_description_ku = "Tu çal nehatin dîtin"
            
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if ext in {'.heic', '.heif'} and os.path.exists(detect_path):
                os.remove(detect_path)
            
            return EnhancedAnalyzeResponse(
                success=True,
                message=f"Enhanced analysis completed: {num_potholes} pothole(s) detected",
                num_potholes=num_potholes,
                max_severity=max_severity,
                ai_description=ai_description,
                ai_description_ar=ai_description_ar,
                ai_description_ku=ai_description_ku,
                detections=result_dict.get("detections", []),
                annotated_image_base64=annotated_base64,
                depth_map_base64=depth_map_base64,
                depth_estimation=result_dict.get("depth_estimation"),
                enhanced_dimensions=result_dict.get("enhanced_dimensions"),
                processing_time_ms=processing_time
            )
        else:
            # Fall back to basic analysis
            print("⚠️ REPLICATE_API_TOKEN not set, using basic analysis")
            
            # Clean up temp files
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if ext in {'.heic', '.heif'} and os.path.exists(detect_path):
                os.remove(detect_path)
            
            raise HTTPException(
                status_code=503,
                detail="Depth estimation unavailable. Set REPLICATE_API_TOKEN environment variable."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        # Clean up on error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


>>>>>>> feature/Ku_feature
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
