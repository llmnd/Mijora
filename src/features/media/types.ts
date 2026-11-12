export type MediaOwnerType = "dish" | "ingredient" | "recipe";
export type MediaKind = "PHOTO" | "ILLUSTRATION";

export type MediaUploadResult = {
  id: string;
  key: string;
  url: string;
};
