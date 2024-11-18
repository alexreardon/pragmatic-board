'use client';

import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Copy, Ellipsis, Plus } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';

import { autoScrollForElements } from '@/pdnd-auto-scroll/entry-point/element';
import { unsafeOverflowAutoScrollForElements } from '@/pdnd-auto-scroll/entry-point/unsafe-overflow/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { Card, CardShadow } from './card';
import {
  getColumnData,
  isCardData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
  TCardData,
  TColumn,
} from './data';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { isSafari } from './is-safari';

type TColumnState =
  | {
      type: 'is-card-over';
      isOverChildCard: boolean;
      dragging: TCardData;
    }
  | {
      type: 'is-column-over';
    }
  | {
      type: 'idle';
    }
  | {
      type: 'is-dragging';
    };

function isShallowEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }
  return keys1.every((key1) => Object.is(obj1[key1], obj2[key1]));
}

const stateStyles: { [Key in TColumnState['type']]: string } = {
  idle: 'cursor-grab',
  'is-card-over': 'outline outline-2 outline-neutral-50',
  'is-dragging': 'opacity-40',
  'is-column-over': 'bg-slate-900',
};

const idle = { type: 'idle' } satisfies TColumnState;

/**
 * A memoized component for rendering out the card.
 *
 * Created so that state changes to the column don't require all cards to be rendered
 */
const CardList = memo(function CardList({ column }: { column: TColumn }) {
  return column.cards.map((card) => <Card key={card.id} card={card} columnId={column.id} />);
});

export function Column({ column }: { column: TColumn }) {
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TColumnState>(idle);

  useEffect(() => {
    const outer = outerRef.current;
    const scrollable = scrollableRef.current;
    const header = headerRef.current;
    const inner = innerRef.current;
    invariant(outer);
    invariant(scrollable);
    invariant(header);
    invariant(inner);
    return combine(
      draggable({
        element: header,
        getInitialData: () => getColumnData({ column }),
        onGenerateDragPreview({ source, location, nativeSetDragImage }) {
          const data = source.data;
          invariant(isColumnData(data));
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({ element: header, input: location.current.input }),
            render({ container }) {
              const rect = inner.getBoundingClientRect();
              const preview = inner.cloneNode(true);
              invariant(preview instanceof HTMLElement);
              preview.style.width = `${rect.width}px`;
              preview.style.height = `${rect.height}px`;
              if (!isSafari()) {
                preview.style.transform = 'rotate(4deg)';
              }

              container.appendChild(preview);
            },
          });
        },
        onDragStart() {
          setState({ type: 'is-dragging' });
        },
        onDrop() {
          setState(idle);
        },
      }),
      dropTargetForElements({
        element: outer,
        canDrop({ source }) {
          return isDraggingACard({ source }) || isDraggingAColumn({ source });
        },
        getIsSticky: () => true,
        onDragStart({ source, location }) {
          if (isCardData(source.data)) {
            const innerMost = location.current.dropTargets[0];
            const isOverChildCard = Boolean(innerMost && isCardData(innerMost.data));
            console.log({ isOverChildCard });
            setState({ type: 'is-card-over', dragging: source.data, isOverChildCard });
          }
        },
        onDragEnter({ source, location }) {
          if (isCardData(source.data)) {
            const innerMost = location.current.dropTargets[0];
            const isOverChildCard = Boolean(innerMost && isCardData(innerMost.data));
            setState({ type: 'is-card-over', dragging: source.data, isOverChildCard });
            return;
          }
          if (isColumnData(source.data) && source.data.column.id !== column.id) {
            setState({ type: 'is-column-over' });
          }
        },
        onDropTargetChange({ source, location }) {
          if (isCardData(source.data)) {
            const innerMost = location.current.dropTargets[0];
            const isOverChildCard = Boolean(innerMost && isCardData(innerMost.data));
            const proposed: TColumnState = {
              type: 'is-card-over',
              dragging: source.data,
              isOverChildCard,
            };
            // optimization
            setState((current) => {
              if (isShallowEqual(proposed, current)) {
                console.log('keys equal - skipping update');
                return current;
              }
              return proposed;
            });
            return;
          }
        },
        onDragLeave({ source }) {
          if (isColumnData(source.data) && source.data.column.id === column.id) {
            return;
          }
          setState(idle);
        },
        onDrop() {
          setState(idle);
        },
      }),
      autoScrollForElements({
        canScroll: isDraggingACard,
        element: scrollable,
      }),
      unsafeOverflowAutoScrollForElements({
        element: scrollable,
        canScroll: isDraggingACard,
        getOverflow() {
          return {
            fromTopEdge: {
              top: 1000,
              right: 0,
              left: 0,
            },
            fromBottomEdge: {
              bottom: 1000,
              right: 0,
              left: 0,
            },
          };
        },
      }),
    );
  }, [column]);

  return (
    <div className="flex w-72 flex-shrink-0 select-none flex-col bg-red-100" ref={outerRef}>
      <div
        className={`flex max-h-full flex-col rounded-lg bg-slate-800 text-neutral-50 ${stateStyles[state.type]}`}
        ref={innerRef}
      >
        {/* Extra wrapping element to make it easy to toggle visibility of content when a column is dragging over */}
        <div
          className={`flex max-h-full flex-col ${state.type === 'is-column-over' ? 'invisible' : ''}`}
        >
          <div className="flex flex-row items-center justify-between p-3 pb-2" ref={headerRef}>
            <div className="pl-2 font-bold leading-4">{column.title}</div>
            <button type="button" className="rounded p-2 hover:bg-slate-700 active:bg-slate-600">
              <Ellipsis size={16} />
            </button>
          </div>
          <div
            className="flex flex-col gap-3 overflow-y-auto p-3 py-1 [overflow-anchor:none] [scrollbar-color:theme(colors.slate.600)_theme(colors.slate.700)] [scrollbar-width:thin]"
            ref={scrollableRef}
          >
            <CardList column={column} />
            {/* TODO: swap this for invisible over last item to avoid jumps */}
            {/* {state.type === 'is-card-over' &&
            state.dragging.columnId !== column.id &&
            !state.isOverChildCard ? (
              <CardShadow card={state.dragging.card} />
            ) : null} */}
          </div>
          <div className="flex flex-row gap-2 p-3">
            <button
              type="button"
              className="flex flex-grow flex-row gap-1 rounded p-2 hover:bg-slate-700 active:bg-slate-600"
            >
              <Plus size={16} />
              <div className="leading-4">Add a card</div>
            </button>
            <button type="button" className="rounded p-2 hover:bg-slate-700 active:bg-slate-600">
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
