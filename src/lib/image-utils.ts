export async function compressImage(file: File, options = { maxWidth: 1920, maxHeight: 1920, quality: 0.8 }): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;

                // Calculate aspect ratio
                if (width > height) {
                    if (width > options.maxWidth) {
                        height = Math.round((height * options.maxWidth) / width);
                        width = options.maxWidth;
                    }
                } else {
                    if (height > options.maxHeight) {
                        width = Math.round((width * options.maxHeight) / height);
                        height = options.maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(file); // Fallback to original if canvas is not supported
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: "image/jpeg",
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file); // Fallback to original on error
                        }
                    },
                    "image/jpeg",
                    options.quality
                );
            };
            img.onerror = (error) => reject(error);
            img.src = event.target?.result as string;
        };
        reader.onerror = (error) => reject(error);
    });
}
