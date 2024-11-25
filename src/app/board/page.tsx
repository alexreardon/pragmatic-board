import { TBoard, TCard, TColumn } from '@/shared/data';
import { Board } from '@/shared/board';

function getInitialData(): TBoard {
  // Doing this so we get consistent ids on server and client
  const getCards = (() => {
    let count: number = 0;

    return function getCards({ amount }: { amount: number }): TCard[] {
      return Array.from({ length: amount }, (): TCard => {
        const id = count++;
        return {
          id: `card:${id}`,
          description: `Card ${id}`,
        };
      });
    };
  })();

  const columns: TColumn[] = [
    { id: 'column:a', title: 'Column A', cards: getCards({ amount: 60 }) },
  ];

  const more: TColumn[] = Array.from({ length: 30 }, (_, index) => ({
    id: `column:${index}`,
    title: `Column ${index}`,
    cards: getCards({ amount: Math.round(30 + Math.random() * 4) }),
  }));

  return {
    // columns: [...columns, ...more],
    columns: [...more],
  };
}

export default function Page() {
  return <Board initial={getInitialData()} />;
}
