export async function uploadImageToCloudinary(file: File) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
  
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      throw new Error("Cloudinary upload failed");
    }
  
    const json = await res.json();
    return json.secure_url as string;
  }  