import mongoose from "mongoose";
const Schema = mongoose.Schema;

const FileSchema = new Schema({
  fileName: String,
  content: Object,
});

export const FolderSchema = new Schema(
  {
    folderName: {
      type: String,
      required: [true, "foldername is required!"],
    },
    path: String, // eg: /user/folderA/folderB
    folders: [Schema.Types.Mixed],
    files: [FileSchema],
    lastModified: Date,
    created: Date,
    owner: Schema.Types.ObjectId,
    parentFolder: Schema.Types.ObjectId,
  },
  {
    strict: false,
  }
);

export interface FolderDTO {
  folderName: string;
  path: string;
  folders: FolderDTO[];
  files: string[];
  lastModified: Date;
  created: Date;
  owner: mongoose.Types.ObjectId;
}

const removeTrailingSlash = (path: string) => {
  return path.slice(-1)[0] === "/" ? path.slice(0, -1) : path; // remove trailing '/'
};

export const FolderModel = mongoose.model(`FolderModel`, FolderSchema);

export const makeFolderModel = async (
  owner: mongoose.Types.ObjectId,
  path: string,
  folderName: string,
  parentFolder: mongoose.Types.ObjectId
) => {
  path = removeTrailingSlash(path);
  // Creating a folder model
  const folder = new FolderModel({
    folderName,
    path: `${path}/${folderName}`,
    lastModified: new Date(),
    created: new Date(),
    folders: [],
    files: [],
    owner,
    parentFolder,
  });

  // Saving the folder to DB
  await folder.save();
  return folder;
};

export const listFolder = async (
  owner: mongoose.Types.ObjectId,
  path: string
): Promise<FolderDTO> => {
  if (!owner || !path) throw new Error("Owner and path are required!");
  path = removeTrailingSlash(path);
  const FolderModel = mongoose.model(`FolderModel`, FolderSchema);
  const folder = await FolderModel.findOne({ path, owner }).populate("folders");
  if (!folder) throw new Error("Folder not found!");
  const result: FolderDTO = folder.toJSON();
  return result;
};

export const makeFolder = async (
  owner: mongoose.Types.ObjectId,
  path: string,
  folderName: string
): Promise<FolderDTO> => {
  if (!owner || !path || !folderName)
    throw new Error("Owner, path and folderName are required!");
  const FolderModel = mongoose.model(`FolderModel`, FolderSchema);
  console.log("creating folder path:", path);
  path = removeTrailingSlash(path);
  const folder = await FolderModel.findOne({ path, owner });
  if (!folder) throw new Error("Folder not found!");
  if (folder.folders.find((folder) => folder.folderName === folderName)) {
    throw new Error(`Folder '${folderName}' already exists on path '${path}'`);
  }
  const subFolder = await makeFolderModel(owner, path, folderName, folder._id);
  console.log("Making subFolder", folderName);
  folder.folders.push(subFolder as any);
  folder.lastModified = new Date();
  await folder.save();
  console.log("Folder added");
  const result: FolderDTO = folder.toJSON();
  return result;
};

const getAllDocsToBeDeleted = async (
  parentId: mongoose.Types.ObjectId,
  accumulator: mongoose.Types.ObjectId[]
) => {
  const parent = await FolderModel.findOne({ _id: parentId }).populate(
    "folders"
  );
  if (!parent) return;
  const children = parent.folders;
  accumulator.push(...children.map((child) => child._id));
  for (let child of children) {
    await getAllDocsToBeDeleted(child._id, accumulator);
  }
  return accumulator;
};

export const removeFolder = async (
  owner: mongoose.Types.ObjectId,
  path: string
): Promise<any> => {
  if (!owner || !path) throw new Error("Owner and path are required!");
  path = removeTrailingSlash(path);
  if (path === "/root") throw new Error("Root folder cannot be deleted!");
  const FolderModel = mongoose.model(`FolderModel`, FolderSchema);

  // Fetching the folder using path
  const folder = await FolderModel.findOne({ path, owner }).populate("folders");
  if (!folder) throw new Error("Folder not found!");

  // Delete reference on its parent
  if (folder.parentFolder) {
    const parent = await FolderModel.findOne({
      _id: folder.parentFolder,
    }).populate("folders");
    const childIndex = parent.folders.findIndex((child) => {
      return child._id.toString() === folder._id.toString();
    });
    parent.folders.splice(childIndex, 1);
    await parent.save();
  }
  const listOfDocs = [folder._id];
  const ids = await getAllDocsToBeDeleted(folder._id, listOfDocs);
  const status = await FolderModel.deleteMany({ _id: { $in: ids } });
  return status;
};

export const addFile = async (
  owner: mongoose.Types.ObjectId,
  path: string,
  fileName: string,
  fileContent: any
) => {
  if (!owner || !path || !fileName || !fileContent)
    throw new Error("Owner, path and folderName are required!");

  const FolderModel = mongoose.model(`FolderModel`, FolderSchema);
  path = removeTrailingSlash(path);
  const folder = await FolderModel.findOne({ path, owner });
  if (!folder) throw new Error("Folder not found!");

  const FileModel = mongoose.model(`FileModel`, FileSchema);
  const file = new FileModel({
    fileName,
    content: fileContent,
  });

  folder.files.push(file);

  const doc = await folder.save();
  console.log("File added!");
  return doc;
};

export const removeFile = async (
  owner: mongoose.Types.ObjectId,
  path: string,
  fileId: mongoose.Types.ObjectId
) => {
  if (!owner || !path || !fileId)
    throw new Error("Owner, path and fileId are required!");

  const FolderModel = mongoose.model(`FolderModel`, FolderSchema);
  path = removeTrailingSlash(path);
  const folder = await FolderModel.findOne({ path, owner });
  if (!folder) throw new Error("Folder not found!");
  const deleteFileIndex = folder.files.findIndex(
    (file) => file._id.toString() === fileId.toString()
  );
  folder.files.splice(deleteFileIndex, 1);
  const doc = await folder.save();
  console.log("File removed: ", fileId);
  return doc;
};
