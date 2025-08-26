import fs from "fs";

export const createFile = async ({ filename, content }) => {
  // 创建目录
  try {
    if (fs.statSync(filename)) {
      fs.mkdirSync(filename, { recursive: true });
    }

    fs.writeFileSync(filename, content);
    return `创建文件成功！`;
  } catch (err) {
    return err.message || "创建文件失败！";
  }
};
