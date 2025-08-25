import fs from "fs";
import path from "path";
export async function readResourse(filepath, filename, isBinary) {
  try {
    const filePath = path.join(process.cwd(), filepath, filename);
    let content = null;
    if (isBinary) {
      const buffer = fs.readFileSync(filePath);
      content = buffer.toString("base64");
    } else {
      content = fs.readFileSync(filePath, "utf8");
    }
    return content;
  } catch (error) {
    return `读取文件失败：${error.message}`;
  }
}
