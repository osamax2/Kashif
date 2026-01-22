"""
Image Processing Pipeline
Orchestrates the complete pothole detection workflow
"""
import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from config import settings
from roboflow_detector import DetectionResult, RoboflowPotholeDetector
from heic_processor import ImageMetadata, extract_metadata, process_heic_image
from report_generator import GeneratedReport, ReportGenerator


@dataclass
class ProcessingResult:
    """Complete result for a single image processing"""
    image_path: str
    original_filename: str
    success: bool
    error_message: Optional[str]
    metadata: Optional[ImageMetadata]
    detection_result: Optional[DetectionResult]
    report: Optional[GeneratedReport]
    processing_time_seconds: float
    
    def to_dict(self):
        return {
            "image_path": self.image_path,
            "original_filename": self.original_filename,
            "success": self.success,
            "error_message": self.error_message,
            "metadata": self.metadata.to_dict() if self.metadata else None,
            "detection_result": self.detection_result.to_dict() if self.detection_result else None,
            "report": self.report.to_dict() if self.report else None,
            "processing_time_seconds": round(self.processing_time_seconds, 2)
        }


@dataclass
class BatchProcessingResult:
    """Result for batch processing of multiple images"""
    total_images: int
    successful: int
    failed: int
    total_potholes_detected: int
    reports_created: int
    processing_time_seconds: float
    results: List[ProcessingResult]
    
    def to_dict(self):
        return {
            "total_images": self.total_images,
            "successful": self.successful,
            "failed": self.failed,
            "total_potholes_detected": self.total_potholes_detected,
            "reports_created": self.reports_created,
            "processing_time_seconds": round(self.processing_time_seconds, 2),
            "results": [r.to_dict() for r in self.results]
        }


class ImageProcessor:
    """
    Complete image processing pipeline:
    1. Convert HEIC to JPEG
    2. Extract GPS/EXIF metadata
    3. Detect potholes with Roboflow/YOLOv8
    4. Estimate size/depth
    5. Create reports
    """
    
    SUPPORTED_EXTENSIONS = {'.heic', '.heif', '.jpg', '.jpeg', '.png'}
    
    def __init__(self):
        self.detector = RoboflowPotholeDetector()
        self.report_generator = ReportGenerator()
        
        # Ensure directories exist
        os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
        os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    
    def process_image(
        self, 
        image_path: str,
        create_report: bool = True,
        move_after_processing: bool = True
    ) -> ProcessingResult:
        """
        Process a single image through the complete pipeline.
        
        Args:
            image_path: Path to the image file
            create_report: Whether to create a report in the reporting-service
            move_after_processing: Whether to move the image to processed folder
        
        Returns:
            ProcessingResult with all details
        """
        import time
        start_time = time.time()
        
        original_filename = os.path.basename(image_path)
        
        try:
            # Check file exists
            if not os.path.exists(image_path):
                return ProcessingResult(
                    image_path=image_path,
                    original_filename=original_filename,
                    success=False,
                    error_message=f"File not found: {image_path}",
                    metadata=None,
                    detection_result=None,
                    report=None,
                    processing_time_seconds=time.time() - start_time
                )
            
            # Check extension
            ext = Path(image_path).suffix.lower()
            if ext not in self.SUPPORTED_EXTENSIONS:
                return ProcessingResult(
                    image_path=image_path,
                    original_filename=original_filename,
                    success=False,
                    error_message=f"Unsupported file type: {ext}",
                    metadata=None,
                    detection_result=None,
                    report=None,
                    processing_time_seconds=time.time() - start_time
                )
            
            # Process HEIC or other image formats
            if ext in {'.heic', '.heif'}:
                print(f"📷 Processing HEIC: {original_filename}")
                jpeg_path, metadata = process_heic_image(image_path, settings.PROCESSED_DIR)
                
                if not jpeg_path:
                    return ProcessingResult(
                        image_path=image_path,
                        original_filename=original_filename,
                        success=False,
                        error_message="Failed to convert HEIC to JPEG",
                        metadata=metadata,
                        detection_result=None,
                        report=None,
                        processing_time_seconds=time.time() - start_time
                    )
            else:
                # For JPEG/PNG, just extract metadata
                jpeg_path = image_path
                metadata = extract_metadata(image_path)
            
            print(f"📍 GPS: {metadata.gps.latitude if metadata.gps else 'N/A'}, "
                  f"{metadata.gps.longitude if metadata.gps else 'N/A'}")
            
            # Run pothole detection
            print(f"🔍 Running YOLOv8 detection...")
            detection_result = self.detector.detect(
                jpeg_path,
                save_annotated=True,
                output_dir=settings.OUTPUT_DIR
            )
            
            print(f"✅ Detected {detection_result.num_potholes} pothole(s) "
                  f"in {detection_result.processing_time_ms:.1f}ms")
            
            # Create report if requested and potholes found
            report = None
            if create_report and detection_result.num_potholes > 0 and metadata.gps:
                print(f"📝 Creating report...")
                report = self.report_generator.create_report_sync(
                    detection_result,
                    metadata,
                    photo_url=None  # Could upload to storage and get URL
                )
            
            # Move original file to processed folder
            if move_after_processing:
                processed_path = os.path.join(settings.PROCESSED_DIR, original_filename)
                if not os.path.exists(processed_path):
                    shutil.move(image_path, processed_path)
                    print(f"📁 Moved to processed: {processed_path}")
            
            return ProcessingResult(
                image_path=image_path,
                original_filename=original_filename,
                success=True,
                error_message=None,
                metadata=metadata,
                detection_result=detection_result,
                report=report,
                processing_time_seconds=time.time() - start_time
            )
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            return ProcessingResult(
                image_path=image_path,
                original_filename=original_filename,
                success=False,
                error_message=str(e),
                metadata=None,
                detection_result=None,
                report=None,
                processing_time_seconds=time.time() - start_time
            )
    
    def process_directory(
        self,
        directory: str,
        create_reports: bool = True,
        move_after_processing: bool = True
    ) -> BatchProcessingResult:
        """
        Process all images in a directory.
        
        Args:
            directory: Path to directory containing images
            create_reports: Whether to create reports
            move_after_processing: Whether to move processed images
        
        Returns:
            BatchProcessingResult with summary and individual results
        """
        import time
        start_time = time.time()
        
        results = []
        total_potholes = 0
        reports_created = 0
        
        # Find all supported images
        image_files = []
        for ext in self.SUPPORTED_EXTENSIONS:
            image_files.extend(Path(directory).glob(f"*{ext}"))
            image_files.extend(Path(directory).glob(f"*{ext.upper()}"))
        
        print(f"\n{'='*60}")
        print(f"🚀 Processing {len(image_files)} images from {directory}")
        print(f"{'='*60}\n")
        
        for i, image_path in enumerate(image_files, 1):
            print(f"\n[{i}/{len(image_files)}] Processing: {image_path.name}")
            print("-" * 40)
            
            result = self.process_image(
                str(image_path),
                create_report=create_reports,
                move_after_processing=move_after_processing
            )
            results.append(result)
            
            if result.success and result.detection_result:
                total_potholes += result.detection_result.num_potholes
            
            if result.report and result.report.success:
                reports_created += 1
        
        successful = sum(1 for r in results if r.success)
        failed = len(results) - successful
        
        total_time = time.time() - start_time
        
        print(f"\n{'='*60}")
        print(f"📊 PROCESSING COMPLETE")
        print(f"{'='*60}")
        print(f"Total images: {len(results)}")
        print(f"Successful: {successful}")
        print(f"Failed: {failed}")
        print(f"Potholes detected: {total_potholes}")
        print(f"Reports created: {reports_created}")
        print(f"Total time: {total_time:.1f}s")
        print(f"{'='*60}\n")
        
        return BatchProcessingResult(
            total_images=len(results),
            successful=successful,
            failed=failed,
            total_potholes_detected=total_potholes,
            reports_created=reports_created,
            processing_time_seconds=total_time,
            results=results
        )
    
    def list_pending_images(self, directory: Optional[str] = None) -> List[str]:
        """List all images pending processing"""
        directory = directory or settings.IMAGES_DIR
        
        image_files = []
        for ext in self.SUPPORTED_EXTENSIONS:
            image_files.extend(Path(directory).glob(f"*{ext}"))
            image_files.extend(Path(directory).glob(f"*{ext.upper()}"))
        
        return [str(f) for f in image_files]


# Export for CLI usage
def process_images_from_cli(directory: Optional[str] = None, create_reports: bool = True):
    """Process images from command line"""
    processor = ImageProcessor()
    directory = directory or settings.IMAGES_DIR
    
    result = processor.process_directory(
        directory,
        create_reports=create_reports,
        move_after_processing=True
    )
    
    # Save results to JSON
    output_file = os.path.join(settings.OUTPUT_DIR, f"processing_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
    
    print(f"📄 Results saved to: {output_file}")
    
    return result


if __name__ == "__main__":
    import sys
    
    directory = sys.argv[1] if len(sys.argv) > 1 else None
    process_images_from_cli(directory)
