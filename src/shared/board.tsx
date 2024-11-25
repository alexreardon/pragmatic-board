'use client';

import { autoScrollForElements } from '@/pdnd-auto-scroll/entry-point/element';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { CSSProperties, useContext, useEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';
import { Column } from './column';
import {
  isCardData,
  isCardDropTargetData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
  TBoard,
  TColumn,
} from './data';
import { SettingsContext } from './settings-context';
import { unsafeOverflowAutoScrollForElements } from '@/pdnd-auto-scroll/entry-point/unsafe-overflow/element';

type THitboxes = {
  'over-element-accelerate': DOMRect;
  'over-element-max-speed': DOMRect;
  overflow: DOMRect;
};

export function Board({ initial }: { initial: TBoard }) {
  const [data, setData] = useState(initial);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const { settings } = useContext(SettingsContext);
  const [hitboxes, setHitboxes] = useState<THitboxes | null>(null);

  useEffect(() => {
    const element = scrollableRef.current;
    invariant(element);
    return combine(
      monitorForElements({
        canMonitor: isDraggingACard,
        onDrop({ source, location }) {
          const dragging = source.data;
          if (!isCardData(dragging)) {
            return;
          }

          const innerMost = location.current.dropTargets[0];

          if (!innerMost) {
            return;
          }
          const dropTargetData = innerMost.data;
          const homeColumnIndex = data.columns.findIndex(
            (column) => column.id === dragging.columnId,
          );
          const home: TColumn | undefined = data.columns[homeColumnIndex];

          if (!home) {
            return;
          }
          const cardIndexInHome = home.cards.findIndex((card) => card.id === dragging.card.id);

          // dropping on a card
          if (isCardDropTargetData(dropTargetData)) {
            const destinationColumnIndex = data.columns.findIndex(
              (column) => column.id === dropTargetData.columnId,
            );
            const destination = data.columns[destinationColumnIndex];
            // reordering in home column
            if (home === destination) {
              const cardFinishIndex = home.cards.findIndex(
                (card) => card.id === dropTargetData.card.id,
              );

              // could not find cards needed
              if (cardIndexInHome === -1 || cardFinishIndex === -1) {
                return;
              }

              // no change needed
              if (cardIndexInHome === cardFinishIndex) {
                return;
              }

              const closestEdge = extractClosestEdge(dropTargetData);

              const reordered = reorderWithEdge({
                axis: 'vertical',
                list: home.cards,
                startIndex: cardIndexInHome,
                indexOfTarget: cardFinishIndex,
                closestEdgeOfTarget: closestEdge,
              });

              const updated: TColumn = {
                ...home,
                cards: reordered,
              };
              const columns = Array.from(data.columns);
              columns[homeColumnIndex] = updated;
              setData({ ...data, columns });
              return;
            }

            // moving card from one column to another

            // unable to find destination
            if (!destination) {
              return;
            }

            const indexOfTarget = destination.cards.findIndex(
              (card) => card.id === dropTargetData.card.id,
            );

            const closestEdge = extractClosestEdge(dropTargetData);
            const finalIndex = closestEdge === 'bottom' ? indexOfTarget + 1 : indexOfTarget;

            // remove card from home list
            const homeCards = Array.from(home.cards);
            homeCards.splice(cardIndexInHome, 1);

            // insert into destination list
            const destinationCards = Array.from(destination.cards);
            destinationCards.splice(finalIndex, 0, dragging.card);

            const columns = Array.from(data.columns);
            columns[homeColumnIndex] = {
              ...home,
              cards: homeCards,
            };
            columns[destinationColumnIndex] = {
              ...destination,
              cards: destinationCards,
            };
            setData({ ...data, columns });
            return;
          }

          // dropping onto a column, but not onto a card
          if (isColumnData(dropTargetData)) {
            const destinationColumnIndex = data.columns.findIndex(
              (column) => column.id === dropTargetData.column.id,
            );
            const destination = data.columns[destinationColumnIndex];

            if (!destination) {
              return;
            }

            // dropping on home
            if (home === destination) {
              console.log('moving card to home column');

              // move to last position
              const reordered = reorder({
                list: home.cards,
                startIndex: cardIndexInHome,
                finishIndex: home.cards.length - 1,
              });

              const updated: TColumn = {
                ...home,
                cards: reordered,
              };
              const columns = Array.from(data.columns);
              columns[homeColumnIndex] = updated;
              setData({ ...data, columns });
              return;
            }

            console.log('moving card to another column');

            // remove card from home list

            const homeCards = Array.from(home.cards);
            homeCards.splice(cardIndexInHome, 1);

            // insert into destination list
            const destinationCards = Array.from(destination.cards);
            destinationCards.splice(destination.cards.length, 0, dragging.card);

            const columns = Array.from(data.columns);
            columns[homeColumnIndex] = {
              ...home,
              cards: homeCards,
            };
            columns[destinationColumnIndex] = {
              ...destination,
              cards: destinationCards,
            };
            setData({ ...data, columns });
            return;
          }
        },
      }),
      monitorForElements({
        canMonitor: isDraggingAColumn,
        onDrop({ source, location }) {
          const dragging = source.data;
          if (!isColumnData(dragging)) {
            return;
          }

          const innerMost = location.current.dropTargets[0];

          if (!innerMost) {
            return;
          }
          const dropTargetData = innerMost.data;

          if (!isColumnData(dropTargetData)) {
            return;
          }

          const homeIndex = data.columns.findIndex((column) => column.id === dragging.column.id);
          const destinationIndex = data.columns.findIndex(
            (column) => column.id === dropTargetData.column.id,
          );

          if (homeIndex === -1 || destinationIndex === -1) {
            return;
          }

          if (homeIndex === destinationIndex) {
            return;
          }

          const reordered = reorder({
            list: data.columns,
            startIndex: homeIndex,
            finishIndex: destinationIndex,
          });
          setData({ ...data, columns: reordered });
        },
      }),
      autoScrollForElements({
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          return isDraggingACard({ source }) || isDraggingAColumn({ source });
        },
        getConfiguration: () => ({ maxScrollSpeed: settings.boardScrollSpeed }),
        element,
      }),
      unsafeOverflowAutoScrollForElements({
        element,
        getConfiguration: () => ({ maxScrollSpeed: settings.boardScrollSpeed }),
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          if (!settings.isOverflowScrollingEnabled) {
            return false;
          }

          return isDraggingACard({ source }) || isDraggingAColumn({ source });
        },
        getOverflow() {
          return {
            fromLeftEdge: {
              top: 1000,
              left: 1000,
              bottom: 1000,
            },
            fromRightEdge: {
              top: 1000,
              right: 1000,
              bottom: 1000,
            },
          };
        },
      }),
    );
  }, [data, settings]);

  useEffect(() => {
    function update() {
      const scrollable = scrollableRef.current;
      invariant(scrollable);
      const rect = scrollable.getBoundingClientRect();
      const overElementHitboxWidth = Math.min(rect.width * 0.25, 180);
      const hitboxes: THitboxes = {
        'over-element-accelerate': DOMRect.fromRect({
          x: rect.right - overElementHitboxWidth,
          y: rect.top,
          height: rect.height,
          width: overElementHitboxWidth / 2,
        }),
        'over-element-max-speed': DOMRect.fromRect({
          x: rect.right - overElementHitboxWidth / 2,
          y: rect.top,
          height: rect.height,
          width: overElementHitboxWidth / 2,
        }),
        overflow: DOMRect.fromRect({
          x: rect.right - overElementHitboxWidth,
          y: 0,
          width: window.innerWidth - rect.right + overElementHitboxWidth,
          height: window.innerHeight,
        }),
      };
      console.log({ rect, window: window.innerWidth });
      // setHitboxes(hitboxes);
    }
    let frameId: number | null = null;
    function schedule() {
      frameId = requestAnimationFrame(() => {
        frameId = null;
        update();
        schedule();
      });
    }

    schedule();

    return function cleanup() {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    // const size = Math.min(box.height * 0.25, 180);
    // console.log({ size });
    // setScrollableRect(size);
  }, []);

  return (
    <>
      <div className={`flex h-full flex-col ${settings.isFilming ? 'px-36 py-20' : ''}`}>
        <div
          className="flex flex-row gap-3 overflow-x-auto rounded border-4 border-purple-700 p-3 [scrollbar-color:theme(colors.sky.600)_theme(colors.sky.800)] [scrollbar-width:thin]"
          ref={scrollableRef}
        >
          {data.columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
        </div>
      </div>
      {hitboxes != null ? (
        <>
          <div
            style={
              {
                '--top': `${hitboxes['overflow'].top}px`,
                '--left': `${hitboxes['overflow'].left}px`,
                '--height': `${hitboxes['overflow'].height}px`,
                '--width': `${hitboxes['overflow'].width}px`,
              } as CSSProperties
            }
            className="pointer-events-none fixed left-[--left] top-[--top] flex h-[--height] w-[--width] flex-col items-end justify-center border-2 border-red-800 bg-red-200 font-bold text-red-500 opacity-80"
          >
            {/* Overflow */}
          </div>
          <div
            style={
              {
                '--top': `${hitboxes['over-element-accelerate'].top}px`,
                '--left': `${hitboxes['over-element-accelerate'].left}px`,
                '--height': `${hitboxes['over-element-accelerate'].height}px`,
                '--width': `${hitboxes['over-element-accelerate'].width}px`,
              } as CSSProperties
            }
            className="pointer-events-none fixed left-[--left] top-[--top] flex h-[--height] w-[--width] flex-col items-center justify-center border bg-green-200 font-bold text-black opacity-80"
          >
            {/* Acceleration ↓ */}
          </div>
          <div
            style={
              {
                '--top': `${hitboxes['over-element-max-speed'].top}px`,
                '--left': `${hitboxes['over-element-max-speed'].left}px`,
                '--height': `${hitboxes['over-element-max-speed'].height}px`,
                '--width': `${hitboxes['over-element-max-speed'].width}px`,
              } as CSSProperties
            }
            className="pointer-events-none fixed left-[--left] top-[--top] flex h-[--height] w-[--width] flex-col items-center justify-center bg-green-400 font-bold text-black opacity-80"
          >
            {/* Max speed */}
          </div>
        </>
      ) : null}
    </>
  );
}
