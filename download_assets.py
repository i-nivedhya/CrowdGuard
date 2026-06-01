# download_assets.py — downloads required assets from Google Drive
import gdown
import os

print("=" * 50)
print("  CrowdGuard AI — Asset Downloader")
print("=" * 50)

# Create folders if they don't exist
os.makedirs("models/CSRNet/weights", exist_ok=True)

print("\nDownloading CSRNet model weights (130MB)...")
print("This may take a few minutes...\n")

gdown.download(
    id="1iPL7kb9GbcO8RRbjRo-3cM-VyY_RNyw6",
    output="models/CSRNet/weights/csrnet_shb.pth",
    quiet=False
)

# Verify download worked
if os.path.exists("models/CSRNet/weights/csrnet_shb.pth"):
    mb = os.path.getsize("models/CSRNet/weights/csrnet_shb.pth") / 1e6
    print(f"\n✓ Download complete: {mb:.1f} MB")
    print("✓ You can now run: python main.py")
else:
    print("\n✗ Download failed!")
    print("  Try manually downloading from Google Drive:")
    print("  https://drive.google.com/file/d/1iPL7kb9GbcO8RRbjRo-3cM-VyY_RNyw6")
    print("  Place the file at: models/CSRNet/weights/csrnet_shb.pth")