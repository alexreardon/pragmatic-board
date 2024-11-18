'use client';

import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import invariant from 'tiny-invariant';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import { isSafari } from '@/shared/is-safari';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { getCardData, isCardData, isDraggingACard, TCard } from './data';

type TCardState =
  | {
      type: 'idle';
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-left-self';
    }
  | {
      type: 'is-over';
      dragging: DOMRect;
      closestEdge: Edge;
    }
  | {
      type: 'preview';
      container: HTMLElement;
      dragging: DOMRect;
    };

const idle: TCardState = { type: 'idle' };

const stateStyles: { [Key in TCardState['type']]: string } = {
  idle: 'bg-slate-700 hover:outline outline-2 outline-neutral-50 cursor-grab',
  'is-dragging': 'bg-slate-700 opacity-40',
  preview: 'bg-slate-700 bg-blue-100',
  'is-over': 'bg-slate-900 pointer-events-none',
  'is-dragging-left-self': 'hidden',
};

const CardInner = forwardRef<
  HTMLDivElement,
  {
    card: TCard;
    state: TCardState;
  }
>(function CardInner({ card, state }, ref) {
  return (
    <>
      {state.type === 'is-over' && state.closestEdge === 'bottom' ? (
        <div
          key={`${card.id}-shadow`}
          style={{ height: state.dragging.height, width: state.dragging.width }}
          className="flex-shrink-0 rounded bg-red-800"
        />
      ) : null}
      <div
        ref={ref}
        key={card.id}
        className={`flex-shrink-0 rounded p-2 text-slate-300 ${stateStyles[state.type]}`}
        style={
          state.type === 'preview'
            ? {
                width: state.dragging.width,
                height: state.dragging.height,
                transform: !isSafari() ? 'rotate(4deg)' : undefined,
              }
            : undefined
        }
      >
        <div>{card.description}</div>
      </div>
      {state.type === 'is-over' && state.closestEdge === 'top' ? (
        <div
          key={`${card.id}-shadow`}
          style={{ height: state.dragging.height, width: state.dragging.width }}
          className="flex-shrink-0 rounded bg-red-800"
        />
      ) : null}
    </>
  );
});

// const isOver: TCardState = { type: 'is-over' };

// export function CardShadow({ card }: { card: TCard }) {
//   return <CardInner state={isOver} card={card} />;
// }

export function Card({ card, columnId }: { card: TCard; columnId: string }) {
  console.log('render', card.id);
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TCardState>(idle);
  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element,
        getInitialData: ({ element }) =>
          getCardData({ card, columnId, rect: element.getBoundingClientRect() }),
        onGenerateDragPreview({ nativeSetDragImage, location, source }) {
          const data = source.data;
          invariant(isCardData(data));
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({ element, input: location.current.input }),
            render({ container }) {
              setState({
                type: 'preview',
                container,
                dragging: element.getBoundingClientRect(),
              });
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
        element,
        // getIsSticky: () => true,
        canDrop: isDraggingACard,
        // TODO: drop targets don't need to publish rect!
        getData: ({ element, input }) => {
          console.log('get data');
          const data = getCardData({ card, columnId, rect: element.getBoundingClientRect() });
          const result = attachClosestEdge(data, {
            input,
            allowedEdges: ['top', 'bottom'],
            element,
          });
          console.log({ closestEdge: extractClosestEdge(result) });
          return result;
        },
        onDragEnter({ source, self }) {
          if (!isCardData(source.data)) {
            return;
          }
          if (source.data.card.id === card.id) {
            return;
          }
          const closestEdge = extractClosestEdge(self.data);
          if (!closestEdge) {
            return;
          }

          setState({ type: 'is-over', dragging: source.data.rect, closestEdge });
        },
        onDrag({ source, self }) {
          if (!isCardData(source.data)) {
            return;
          }
          if (source.data.card.id === card.id) {
            return;
          }
          const closestEdge = extractClosestEdge(self.data);
          if (!closestEdge) {
            return;
          }

          console.log('drag', closestEdge);
          setState({ type: 'is-over', dragging: source.data.rect, closestEdge });
        },
        onDragLeave({ source }) {
          if (!isCardData(source.data)) {
            return;
          }
          if (source.data.card.id === card.id) {
            setState({ type: 'is-dragging-left-self' });
            return;
          }
          setState(idle);
        },
        onDrop() {
          setState(idle);
        },
      }),
    );
  }, [card, columnId]);
  return (
    <>
      {state.type === 'is-dragging-left-self' ? null : (
        <CardInner ref={ref} state={state} card={card} />
      )}
      {state.type === 'preview'
        ? createPortal(<CardInner state={state} card={card} />, state.container)
        : null}
    </>
  );
}
