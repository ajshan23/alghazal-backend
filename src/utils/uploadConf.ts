import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Initialize S3 client
const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "a",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "a+a",
  },
});

// Constants
const BUCKET_NAME = "krishnadas-test-1";
const USER_IMAGES_FOLDER = "user-images";
const UNIT_OF_MEASURMENT_FOLDER = "uom-images";
const SIGNATURES_FOLDER = "signatures";

// Generate a unique file name for uploaded files
function generateUniqueFileName(file: Express.Multer.File): string {
  const extension = path.extname(file.originalname);
  const filename = path.basename(file.originalname, extension);
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${filename}-${uniqueSuffix}${extension}`;
}

// Core upload function with folder support
async function uploadFileToS3(
  file: Express.Multer.File,
  folder?: string
): Promise<{ url: string; key: string; mimetype: string }> {
  const uniqueFileName = folder
    ? `${folder}/${generateUniqueFileName(file)}`
    : generateUniqueFileName(file);

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: uniqueFileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const upload = new Upload({
    client: s3,
    params: uploadParams,
  });

  await upload.done();
  const fileUrl = `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${encodeURIComponent(
    uniqueFileName
  )}`;

  return {
    url: fileUrl,
    key: uniqueFileName,
    mimetype: file.mimetype,
  };
}

// Process an image file (resize and compress)
async function processImage(
  file: Express.Multer.File,
  options?: { width?: number; height?: number; format?: "jpeg" | "png" }
): Promise<Buffer> {
  const { width = 800, height, format = "jpeg" } = options || {};

  let processor = sharp(file.buffer).resize({
    width,
    height,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (format === "jpeg") {
    processor = processor.jpeg({ quality: 85, mozjpeg: true });
  } else {
    processor = processor.png({ quality: 90, compressionLevel: 8 });
  }

  return processor.toBuffer();
}

// Compress a PDF file
async function compressPDFBuffer(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const compressedPDFBytes = await pdfDoc.save();
    return Buffer.from(compressedPDFBytes);
  } catch (error) {
    console.error("Error compressing PDF:", error);
    throw new Error("Failed to compress PDF");
  }
}

// Upload user profile image (optimized for profile pictures)
export async function uploadUserProfileImage(
  file: Express.Multer.File
): Promise<{
  success: boolean;
  message: string;
  uploadData?: { url: string; key: string; mimetype: string };
}> {
  try {
    // Process the image (square crop and compress)
    const processedFileBuffer = await sharp(file.buffer)
      .resize({ width: 500, height: 500, fit: "cover" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    // Create a new file object with processed buffer
    const processedFile = {
      ...file,
      buffer: processedFileBuffer,
      mimetype: "image/jpeg",
    };

    const uploadResult = await uploadFileToS3(
      processedFile,
      USER_IMAGES_FOLDER
    );

    return {
      success: true,
      message: "User profile image uploaded successfully",
      uploadData: uploadResult,
    };
  } catch (err) {
    console.error("Error uploading user profile image:", err);
    return {
      success: false,
      message: "User profile image upload failed",
    };
  }
}

export async function uploadUnitImage(file: Express.Multer.File): Promise<{
  success: boolean;
  message: string;
  uploadData?: { url: string; key: string; mimetype: string };
}> {
  try {
    // Process the image (square crop and compress)
    const processedFileBuffer = await sharp(file.buffer)
      .resize({ width: 400, height: 150, fit: "cover" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    // Create a new file object with processed buffer
    const processedFile = {
      ...file,
      buffer: processedFileBuffer,
      mimetype: "image/jpeg",
    };

    const uploadResult = await uploadFileToS3(
      processedFile,
      UNIT_OF_MEASURMENT_FOLDER
    );

    return {
      success: true,
      message: "uom image uploaded successfully",
      uploadData: uploadResult,
    };
  } catch (err) {
    console.error("Error uploading uom  image:", err);
    return {
      success: false,
      message: " uom image upload failed",
    };
  }
}

// Upload signature image (optimized for signatures)
export async function uploadSignatureImage(file: Express.Multer.File): Promise<{
  success: boolean;
  message: string;
  uploadData?: { url: string; key: string; mimetype: string };
}> {
  try {
    // Process the signature (transparent background)
    const processedFileBuffer = await sharp(file.buffer)
      .resize({
        width: 400,
        height: 200,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    // Create a new file object with processed buffer
    const processedFile = {
      ...file,
      buffer: processedFileBuffer,
      mimetype: "image/png",
    };

    const uploadResult = await uploadFileToS3(processedFile, SIGNATURES_FOLDER);

    return {
      success: true,
      message: "Signature image uploaded successfully",
      uploadData: uploadResult,
    };
  } catch (err) {
    console.error("Error uploading signature image:", err);
    return {
      success: false,
      message: "Signature image upload failed",
    };
  }
}

// Handle single file upload (generic)
export async function handleSingleFileUpload(
  file: Express.Multer.File
): Promise<{
  success: boolean;
  message: string;
  uploadData?: { url: string; key: string; mimetype: string };
}> {
  try {
    let processedFileBuffer: Buffer | undefined;

    // Process based on file type
    if (file.mimetype.startsWith("image/")) {
      processedFileBuffer = await processImage(file);
    } else if (file.mimetype === "application/pdf") {
      processedFileBuffer = await compressPDFBuffer(file.buffer);
    }

    // Use processed or original buffer
    const finalFile = {
      ...file,
      buffer: processedFileBuffer || file.buffer,
    };

    const uploadResult = await uploadFileToS3(finalFile);

    return {
      success: true,
      message: "File uploaded successfully",
      uploadData: uploadResult,
    };
  } catch (err) {
    console.error("Error uploading file:", err);
    return {
      success: false,
      message: "File upload failed",
    };
  }
}

// Handle multiple file uploads (generic)
export async function handleMultipleFileUploads(
  files: Express.Multer.File[]
): Promise<{
  success: boolean;
  message: string;
  uploadData?: Array<{ url: string; key: string; mimetype: string }>;
}> {
  try {
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        let processedFileBuffer: Buffer | undefined;

        if (file.mimetype.startsWith("image/")) {
          processedFileBuffer = await processImage(file);
        } else if (file.mimetype === "application/pdf") {
          processedFileBuffer = await compressPDFBuffer(file.buffer);
        }

        const finalFile = {
          ...file,
          buffer: processedFileBuffer || file.buffer,
        };

        return await uploadFileToS3(finalFile);
      })
    );

    return {
      success: true,
      message: "Files uploaded successfully",
      uploadData: uploadResults,
    };
  } catch (err) {
    console.error("Error uploading files:", err);
    return {
      success: false,
      message: "File upload failed",
    };
  }
}

// Delete file from S3
export async function deleteFileFromS3(key: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);

    return {
      success: true,
      message: `File deleted successfully: ${key}`,
    };
  } catch (err) {
    console.error(`Error deleting file from S3: ${err}`);
    return {
      success: false,
      message: "Failed to delete file from S3",
    };
  }
}

// Utility to extract key from S3 URL
export function getS3KeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return decodeURIComponent(urlObj.pathname.substring(1)); // Remove leading slash
  } catch (err) {
    console.error("Error parsing S3 URL:", err);
    throw new Error("Invalid S3 URL");
  }
}

export default {
  uploadUserProfileImage,
  uploadSignatureImage,
  handleSingleFileUpload,
  handleMultipleFileUploads,
  deleteFileFromS3,
  getS3KeyFromUrl,
};
