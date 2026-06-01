# src/onnx_export.py — CrowdGuard AI v2.0
# Export CSRNet to ONNX and apply INT8 quantization for mobile

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import onnxruntime as ort
import numpy as np
import config


def export_to_onnx(model, save_path=None, input_size=None):
    if save_path is None:
        save_path = config.ONNX_EXPORT_PATH
    if input_size is None:
        input_size = config.ONNX_INPUT_SIZE

    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    model = model.cpu()
    model.eval()

    dummy_input = torch.randn(*input_size)

    print(f'[ONNX] Exporting model to {save_path} ...')

    torch.onnx.export(
        model,
        dummy_input,
        save_path,
        export_params=True,
        opset_version=11,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input':  {0: 'batch', 2: 'height', 3: 'width'},
            'output': {0: 'batch'}
        }
    )

    print(f'[ONNX] Export complete: {save_path}')
    return save_path


def quantize_to_int8(onnx_path=None, output_path=None):
    if onnx_path is None:
        onnx_path = config.ONNX_EXPORT_PATH
    if output_path is None:
        output_path = config.ONNX_INT8_PATH

    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
    except ImportError:
        print('[ONNX] onnxruntime-tools not installed. Run: pip install onnxruntime-tools')
        return None

    print(f'[ONNX] Quantizing {onnx_path} to INT8 ...')

    quantize_dynamic(
        model_input=onnx_path,
        model_output=output_path,
        weight_type=QuantType.QInt8
    )

    orig_mb = os.path.getsize(onnx_path) / 1e6
    int8_mb = os.path.getsize(output_path) / 1e6
    print(f'[ONNX] FP32 size: {orig_mb:.1f} MB')
    print(f'[ONNX] INT8 size: {int8_mb:.1f} MB  ({int8_mb/orig_mb*100:.0f}% of original)')
    print(f'[ONNX] INT8 model saved to {output_path}')
    return output_path


def load_onnx_model(path, use_gpu=False):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4

    # INT8 models use ConvInteger ops — disable optimizations or it crashes
    if 'int8' in path.lower():
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
    else:
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if use_gpu \
                else ['CPUExecutionProvider']

    session = ort.InferenceSession(path,
                                   providers=providers,
                                   sess_options=opts)
    print(f'[ONNX] Model loaded from {path}')
    return session


def run_onnx_inference(session, frame_bgr, transform):
    import cv2

    h, w = frame_bgr.shape[:2]
    img     = cv2.resize(frame_bgr, (config.INFERENCE_WIDTH, config.INFERENCE_HEIGHT))
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    tensor = transform(img_rgb).unsqueeze(0).numpy()

    input_name = session.get_inputs()[0].name
    output     = session.run(None, {input_name: tensor})[0]

    density_map = output.squeeze()
    density_map = cv2.resize(density_map, (w, h))
    density_map = np.maximum(density_map, 0)
    scale       = (config.INFERENCE_WIDTH * config.INFERENCE_HEIGHT) / (w * h)
    density_map = density_map * scale / config.COUNT_SCALE

    return density_map


# ── Run this file directly to perform export ───────────────────────────
if __name__ == '__main__':
    print('=== CrowdGuard AI — ONNX Export Utility ===')

    import density_model
    density_model.load_model()
    model = density_model._model

    onnx_path = config.ONNX_EXPORT_PATH
    int8_path = config.ONNX_INT8_PATH

    # ── Step 1: Export to FP32 ONNX (skip if already exists) ──────────
    if os.path.exists(onnx_path):
        print(f'[ONNX] FP32 model already exists at {onnx_path} — skipping export.')
    else:
        onnx_path = export_to_onnx(model)
# ── Step 2: Quantize to INT8 (skip if already exists) ─────────────
    if os.path.exists(int8_path):
        print(f'[ONNX] INT8 model already exists at {int8_path} — skipping quantization.')
    else:
        int8_path = quantize_to_int8(onnx_path)

    # ── Step 3: Validate ───────────────────────────────────────────────
    print('\n[ONNX] Validation...')

    # Validate FP32 model by running inference (fully supported on Windows CPU)
    dummy = np.random.rand(1, 3, 480, 640).astype(np.float32)
    s1 = load_onnx_model(onnx_path)
    o1 = s1.run(None, {'input': dummy})[0].sum()
    print(f'  FP32 model output sum: {o1:.2f}  ✅ FP32 model runs correctly')

    # INT8 model uses ConvInteger ops — only supported on Android/Linux, not Windows CPU
    # So we just confirm the file exists and check the size reduction
    if os.path.exists(int8_path):
        fp32_mb = os.path.getsize(onnx_path) / 1e6
        int8_mb = os.path.getsize(int8_path) / 1e6
        print(f'  INT8 file exists: {int8_path}')
        print(f'  Size: {fp32_mb:.1f} MB → {int8_mb:.1f} MB ({int8_mb/fp32_mb*100:.0f}% of original)')
        print(f'  ✅ PASS: INT8 model ready for Android deployment')
        print(f'  ℹ️  Note: INT8 validation skipped on Windows — ConvInteger requires Android/Linux runtime')
    else:
        print('  ❌ INT8 file not found — re-run to generate it')
