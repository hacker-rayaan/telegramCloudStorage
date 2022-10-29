import React, { useEffect, useState } from "react";
import { FileOutlined } from "@ant-design/icons";
import "./folder.css";
import { getDownloadURL } from "../../services/file";
import { Skeleton } from "antd";
import { shortenFileName } from "../../services/common";
import { isMobile } from "react-device-detect";

interface FolderProps {
  fileName: string;
  onClick: any;
  thumbnail: string;
}
const File: React.FC<FolderProps> = ({ fileName, onClick, thumbnail }) => {
  const [icon, setIcon] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (thumbnail) {
      getDownloadURL(thumbnail)
        .then((image) => {
          setIcon(image.url);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [thumbnail]);

  return (
    <span
      className={isMobile ? "file file-mobile" : "file"}
      onDoubleClick={onClick}
    >
      <div>
        {!thumbnail ? (
          <FileOutlined size={30} className="fileIcon" />
        ) : loading ? (
          <Skeleton.Image
            className={
              isMobile ? "imageSkeleton imageSkeleton-mobile" : "imageSkeleton"
            }
            active
          />
        ) : (
          <img src={icon} alt="thumbnail" />
        )}
      </div>
      <p>{shortenFileName(fileName)}</p>
    </span>
  );
};

export default File;
