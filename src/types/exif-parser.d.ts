declare module 'exif-parser' {
  interface ExifParserResult {
    imageSize: {
      width: number;
      height: number;
    };
    tags: {
      Orientation?: number;
      Make?: string;
      Model?: string;
      Software?: string;
      DateTimeOriginal?: number;
      ExposureTime?: number;
      FNumber?: number;
      ISO?: number;
      FocalLength?: number;
      GPSLatitude?: number;
      GPSLongitude?: number;
    };
  }

  interface ExifParser {
    create(buffer: Buffer): {
      parse(): ExifParserResult;
    };
  }

  const parser: ExifParser;
  export = parser;
} 