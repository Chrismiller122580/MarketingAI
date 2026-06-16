export type PinterestBoard = {
  id: string;
  name: string;
};

export async function fetchPinterestBoards(
  accessToken: string,
): Promise<PinterestBoard[]> {
  const res = await fetch("https://api.pinterest.com/v5/boards?page_size=25", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{ id?: string; name?: string }>;
  };

  return (data.items ?? [])
    .filter((b): b is { id: string; name: string } => !!b.id && !!b.name)
    .map((b) => ({ id: b.id, name: b.name }));
}

export async function resolvePinterestBoard(
  accessToken: string,
  preferredBoardId?: string,
): Promise<{ accessToken: string; boardId: string; boardName: string } | null> {
  const boards = await fetchPinterestBoards(accessToken);
  if (boards.length === 0) return null;

  const board =
    (preferredBoardId
      ? boards.find((b) => b.id === preferredBoardId)
      : undefined) ?? boards[0];

  return {
    accessToken,
    boardId: board.id,
    boardName: board.name,
  };
}