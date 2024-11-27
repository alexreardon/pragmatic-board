'use client';

import { autoScrollForElements } from '@/pdnd-auto-scroll/entry-point/element';
import { unsafeOverflowAutoScrollForElements } from '@/pdnd-auto-scroll/entry-point/unsafe-overflow/element';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { CleanupFn, Position } from '@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { bindAll } from 'bind-event-listener';
import { useEffect, useRef, useState } from 'react';
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

export function Board({ initial }: { initial: TBoard }) {
  const [data, setData] = useState(initial);
  const scrollableRef = useRef<HTMLDivElement | null>(null);

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
        canScroll: ({ source }) => isDraggingACard({ source }) || isDraggingAColumn({ source }),
        getConfiguration: () => ({ maxScrollSpeed: 'fast' }),
        element,
      }),
      unsafeOverflowAutoScrollForElements({
        element,
        getConfiguration: () => ({ maxScrollSpeed: 'fast' }),
        canScroll: ({ source }) => isDraggingACard({ source }) || isDraggingAColumn({ source }),
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
  }, [data]);

  // Custom click to scroll board
  useEffect(() => {
    let cleanupActive: CleanupFn | null = null;
    const scrollable = scrollableRef.current;
    invariant(scrollable);

    function begin({ start }: { start: Position }) {
      type State =
        | {
            type: 'waiting-to-move-enough';
            start: Position;
          }
        | {
            type: 'scrolling';
            last: Position;
          };

      let state: State = {
        type: 'waiting-to-move-enough',
        start,
      };

      const cleanupEvents = bindAll(
        window,
        [
          {
            type: 'pointercancel',
            listener: () => cleanupEvents(),
          },
          {
            type: 'pointerup',
            listener: () => cleanupEvents(),
          },
          {
            type: 'pointerdown',
            listener: () => cleanupEvents(),
          },
          {
            type: 'keydown',
            listener: () => cleanupEvents(),
          },
          {
            type: 'resize',
            listener: () => cleanupEvents(),
          },
          {
            type: 'pointermove',
            listener(event) {
              const current: Position = {
                x: event.clientX,
                y: event.clientY,
              };
              if (state.type === 'waiting-to-move-enough') {
                const diff: Position = {
                  x: state.start.x - current.x,
                  y: state.start.y - current.y,
                };
                const hasMovedEnough = Math.abs(diff.x) > 10 || Math.abs(diff.y) > 10;
                if (!hasMovedEnough) {
                  return;
                }
                state = {
                  type: 'scrolling',
                  last: current,
                };
                return;
              }

              const diff: Position = {
                x: state.last.x - current.x,
                y: state.last.y - current.y,
              };
              state = {
                type: 'scrolling',
                last: current,
              };
              scrollable?.scrollBy({ left: diff.x, top: diff.y });
            },
          },
        ],
        // need to make sure we are not after the "pointerdown" on the scrollable
        // Also this is helpful to make sure we always hear about events from this point
        { capture: true },
      );

      cleanupActive = cleanupEvents;
    }

    const cleanupStart = bindAll(scrollable, [
      {
        type: 'pointerdown',
        listener(event) {
          if (!(event.target instanceof HTMLElement)) {
            return;
          }
          // ignore interactive elements
          if (event.target.closest('button,a,input')) {
            return;
          }

          begin({ start: { x: event.clientX, y: event.clientY } });
        },
      },
    ]);

    return function cleanupAll() {
      cleanupStart();
      cleanupActive?.();
    };
  }, []);

  return (
    <div
      className="flex h-full flex-row gap-3 overflow-x-auto p-3 [overflow-anchor:none] [scrollbar-color:theme(colors.sky.600)_theme(colors.sky.800)] [scrollbar-width:thin]"
      ref={scrollableRef}
    >
      {data.columns.map((column) => (
        <Column key={column.id} column={column} />
      ))}
    </div>
  );
}
