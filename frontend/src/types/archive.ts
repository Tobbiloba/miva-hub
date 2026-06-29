export type Archive = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ArchiveItem = {
  id: string;
  archiveId: string;
  itemId: string;
  userId: string;
  addedAt: Date;
};

export type ArchiveWithItemCount = Archive & {
  itemCount: number;
};
