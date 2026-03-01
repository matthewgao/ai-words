import type { PixelCrop } from "react-image-crop";

function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.addEventListener("load", () => resolve(img));
		img.addEventListener("error", (err) => reject(err));
		img.crossOrigin = "anonymous";
		img.src = url;
	});
}

export async function getCroppedImg(
	imageSrc: string,
	pixelCrop: PixelCrop,
	displayWidth: number,
	displayHeight: number,
): Promise<Blob> {
	const image = await createImage(imageSrc);
	const scaleX = image.naturalWidth / displayWidth;
	const scaleY = image.naturalHeight / displayHeight;

	const cropX = pixelCrop.x * scaleX;
	const cropY = pixelCrop.y * scaleY;
	const cropWidth = pixelCrop.width * scaleX;
	const cropHeight = pixelCrop.height * scaleY;

	const canvas = document.createElement("canvas");
	canvas.width = cropWidth;
	canvas.height = cropHeight;
	const ctx = canvas.getContext("2d")!;

	ctx.drawImage(
		image,
		cropX,
		cropY,
		cropWidth,
		cropHeight,
		0,
		0,
		cropWidth,
		cropHeight,
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("Canvas toBlob failed"));
		}, "image/jpeg");
	});
}
