#!/usr/bin/env python3
"""
Train YOLOv8 model on pothole dataset
Based on: https://github.com/mounishvatti/pothole_detection_yolov8
"""
import os
import sys
from pathlib import Path

from ultralytics import YOLO


def download_pothole_dataset():
    """
    Download pothole dataset from Roboflow or prepare custom dataset.
    
    Dataset structure should be:
    dataset/
    ├── train/
    │   ├── images/
    │   └── labels/
    ├── valid/
    │   ├── images/
    │   └── labels/
    └── data.yaml
    """
    print("📥 Dataset Setup Instructions:")
    print("-" * 50)
    print("1. Download pothole dataset from Roboflow:")
    print("   https://universe.roboflow.com/pothole-detection")
    print("")
    print("2. Or use the dataset from the reference repo:")
    print("   https://github.com/mounishvatti/pothole_detection_yolov8")
    print("")
    print("3. Place the dataset in: /app/dataset/")
    print("-" * 50)


def create_dataset_yaml(dataset_path: str = "/app/dataset"):
    """Create data.yaml for YOLOv8 training"""
    yaml_content = f"""
# Pothole Detection Dataset
path: {dataset_path}
train: train/images
val: valid/images

# Classes
names:
  0: pothole
"""
    
    yaml_path = os.path.join(dataset_path, "data.yaml")
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)
    
    print(f"✅ Created data.yaml at {yaml_path}")
    return yaml_path


def train_model(
    dataset_yaml: str = "/app/dataset/data.yaml",
    model_name: str = "yolov8n.pt",
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    output_dir: str = "/app/models"
):
    """
    Train YOLOv8 model on pothole dataset.
    
    Args:
        dataset_yaml: Path to data.yaml
        model_name: Base model to use (yolov8n, yolov8s, yolov8m, yolov8l, yolov8x)
        epochs: Number of training epochs
        imgsz: Image size for training
        batch: Batch size
        output_dir: Directory to save trained model
    """
    print(f"🚀 Starting YOLOv8 Training")
    print(f"   Base model: {model_name}")
    print(f"   Dataset: {dataset_yaml}")
    print(f"   Epochs: {epochs}")
    print(f"   Image size: {imgsz}")
    print(f"   Batch size: {batch}")
    print("-" * 50)
    
    # Load base model
    model = YOLO(model_name)
    
    # Train
    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=output_dir,
        name="pothole_detection",
        save=True,
        patience=20,
        device="cpu",  # Change to "0" for GPU
        workers=4,
        exist_ok=True
    )
    
    # Save best model
    best_model_path = os.path.join(output_dir, "pothole_detection", "weights", "best.pt")
    final_model_path = os.path.join(output_dir, "pothole_model.pt")
    
    if os.path.exists(best_model_path):
        import shutil
        shutil.copy(best_model_path, final_model_path)
        print(f"\n✅ Training complete!")
        print(f"📁 Best model saved to: {final_model_path}")
    
    return results


def validate_model(model_path: str, dataset_yaml: str):
    """Validate trained model on validation set"""
    print(f"🔍 Validating model: {model_path}")
    
    model = YOLO(model_path)
    results = model.val(data=dataset_yaml)
    
    print(f"\n📊 Validation Results:")
    print(f"   mAP50: {results.box.map50:.4f}")
    print(f"   mAP50-95: {results.box.map:.4f}")
    
    return results


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train YOLOv8 Pothole Detection Model")
    parser.add_argument("--dataset", default="/app/dataset/data.yaml", help="Path to data.yaml")
    parser.add_argument("--model", default="yolov8n.pt", help="Base model (yolov8n, yolov8s, etc.)")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--output", default="/app/models", help="Output directory")
    
    args = parser.parse_args()
    
    # Check if dataset exists
    if not os.path.exists(args.dataset):
        download_pothole_dataset()
        sys.exit(1)
    
    # Train model
    train_model(
        dataset_yaml=args.dataset,
        model_name=args.model,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        output_dir=args.output
    )
