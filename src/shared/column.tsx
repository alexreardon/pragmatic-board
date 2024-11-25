'use client';

import {
  draggable,
  dropTargetForElements,
  ElementEventBasePayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Copy, Ellipsis, Plus } from 'lucide-react';
import {
  CSSProperties,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import invariant from 'tiny-invariant';

import { autoScrollForElements } from '@/pdnd-auto-scroll/entry-point/element';
import { unsafeOverflowAutoScrollForElements } from '@/pdnd-auto-scroll/entry-point/unsafe-overflow/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { Card, CardShadow } from './card';
import {
  getColumnData,
  isCardData,
  isCardDropTargetData,
  isColumnData,
  isDraggingACard,
  isDraggingAColumn,
  TCardData,
  TColumn,
} from './data';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { isSafari } from './is-safari';
import { DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types';
import { isShallowEqual } from './is-shallow-equal';
import { SettingsContext } from './settings-context';

type TColumnState =
  | {
      type: 'is-card-over';
      isOverChildCard: boolean;
      dragging: DOMRect;
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

type THitboxes = {
  'over-element-accelerate': DOMRect;
  'over-element-max-speed': DOMRect;
  overflow: DOMRect;
};

export function Column({ column }: { column: TColumn }) {
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const outerFullHeightRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const { settings } = useContext(SettingsContext);
  const [state, setState] = useState<TColumnState>(idle);
  const [hitboxes, setHitboxes] = useState<THitboxes | null>(null);

  useEffect(() => {
    const outer = outerFullHeightRef.current;
    const scrollable = scrollableRef.current;
    const header = headerRef.current;
    const inner = innerRef.current;
    invariant(outer);
    invariant(scrollable);
    invariant(header);
    invariant(inner);

    const data = getColumnData({ column });

    function setIsCardOver({ data, location }: { data: TCardData; location: DragLocationHistory }) {
      const innerMost = location.current.dropTargets[0];
      const isOverChildCard = Boolean(innerMost && isCardDropTargetData(innerMost.data));

      const proposed: TColumnState = {
        type: 'is-card-over',
        dragging: data.rect,
        isOverChildCard,
      };
      // optimization - don't update state if we don't need to.
      setState((current) => {
        if (isShallowEqual(proposed, current)) {
          return current;
        }
        return proposed;
      });
    }

    return combine(
      draggable({
        element: header,
        getInitialData: () => data,
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
        getData: () => data,
        canDrop({ source }) {
          return isDraggingACard({ source }) || isDraggingAColumn({ source });
        },
        getIsSticky: () => true,
        onDragStart({ source, location }) {
          if (isCardData(source.data)) {
            setIsCardOver({ data: source.data, location });
          }
        },
        onDragEnter({ source, location }) {
          if (isCardData(source.data)) {
            setIsCardOver({ data: source.data, location });
            return;
          }
          if (isColumnData(source.data) && source.data.column.id !== column.id) {
            setState({ type: 'is-column-over' });
          }
        },
        onDropTargetChange({ source, location }) {
          if (isCardData(source.data)) {
            setIsCardOver({ data: source.data, location });
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
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          return isDraggingACard({ source });
        },
        getConfiguration: () => ({ maxScrollSpeed: settings.columnScrollSpeed }),
        element: scrollable,
      }),
      unsafeOverflowAutoScrollForElements({
        element: scrollable,
        getConfiguration: () => ({ maxScrollSpeed: settings.columnScrollSpeed }),
        canScroll({ source }) {
          if (!settings.isOverElementAutoScrollEnabled) {
            return false;
          }

          if (!settings.isOverflowScrollingEnabled) {
            return false;
          }

          return isDraggingACard({ source });
        },
        getOverflow() {
          return {
            fromTopEdge: {
              top: 10000,
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
  }, [column, settings]);

  useEffect(() => {
    if (!settings.areHitboxesVisible) {
      setHitboxes(null);
      return;
    }
    function update() {
      const scrollable = scrollableRef.current;
      invariant(scrollable);
      const rect = scrollable.getBoundingClientRect();
      const overElementHitboxHeight = Math.min(rect.height * 0.25, 180);
      const hitboxes: THitboxes = {
        'over-element-accelerate': DOMRect.fromRect({
          x: rect.x,
          y: rect.bottom - overElementHitboxHeight,
          height: overElementHitboxHeight / 2,
          width: rect.width,
        }),
        'over-element-max-speed': DOMRect.fromRect({
          x: rect.x,
          y: rect.bottom - overElementHitboxHeight / 2,
          height: overElementHitboxHeight / 2,
          width: rect.width,
        }),
        overflow: DOMRect.fromRect({
          x: rect.x,
          y: rect.bottom,
          width: rect.width,
          height: window.innerHeight - rect.bottom,
        }),
      };
      setHitboxes(hitboxes);
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
  }, [settings]);

  return (
    <>
      <div className="flex w-72 flex-shrink-0 select-none flex-col" ref={outerFullHeightRef}>
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
              className="flex flex-col overflow-y-auto [overflow-anchor:none] [scrollbar-color:theme(colors.slate.600)_theme(colors.slate.700)] [scrollbar-width:thin]"
              ref={scrollableRef}
            >
              <CardList column={column} />
              {state.type === 'is-card-over' && !state.isOverChildCard ? (
                <div className="flex-shrink-0 px-3 py-1">
                  <CardShadow dragging={state.dragging} />
                </div>
              ) : null}
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
            className="pointer-events-none fixed left-[--left] top-[--top] flex h-[--height] w-[--width] flex-col items-center justify-center bg-red-200 font-bold text-red-500 opacity-80"
          >
            {/* Overflow 🤩 */}
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
            {/* Max speed 🚀 */}
          </div>
        </>
      ) : null}
    </>
  );
}
