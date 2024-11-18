export type TCard = {
  id: string;
  description: string;
};

export type TColumn = {
  id: string;
  title: string;
  cards: TCard[];
};

export type TBoard = {
  columns: TColumn[];
};

const cardKey = Symbol('card');
export type TCardData = {
  [cardKey]: true;
  card: TCard;
  columnId: string;
  rect: DOMRect;
};

export function getCardData({
  card,
  rect,
  columnId,
}: Omit<TCardData, typeof cardKey> & { columnId: string }): TCardData {
  return {
    [cardKey]: true,
    card,
    columnId,
    rect,
  };
}

export function isCardData(value: Record<string | symbol, unknown>): value is TCardData {
  return Boolean(value[cardKey]);
}

export function isDraggingACard({
  source,
}: {
  source: { data: Record<string | symbol, unknown> };
}): boolean {
  return isCardData(source.data);
}

const columnKey = Symbol('column');
export type TColumnData = {
  [columnKey]: true;
  column: TColumn;
};

export function getColumnData({ column }: Omit<TColumnData, typeof columnKey>): TColumnData {
  return {
    [columnKey]: true,
    column,
  };
}

export function isColumnData(value: Record<string | symbol, unknown>): value is TColumnData {
  return Boolean(value[columnKey]);
}

export function isDraggingAColumn({
  source,
}: {
  source: { data: Record<string | symbol, unknown> };
}): boolean {
  return isColumnData(source.data);
}
