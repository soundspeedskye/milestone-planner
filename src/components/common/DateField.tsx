import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { ko } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { fmt, parseDate } from "../../lib/workdays";

interface Props {
  /** YYYY-MM-DD. 없으면 미선택 */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 트리거 버튼에 얹을 클래스 (예: 'pinned') */
  className?: string;
  /** 선택돼 있으면 지우기(✕) 버튼 표시 */
  clearable?: boolean;
  /** 이 날짜들을 달력에서 '휴무'로 흐리게 표시 (선택은 여전히 가능) */
  holidays?: string[];
  id?: string;
  "aria-label"?: string;
}

const POP_GAP = 4; // 트리거와 팝오버 사이
const POP_MARGIN = 8; // 팝오버와 화면 가장자리 사이

/**
 * 팝오버 위치를 트리거 기준으로 잡는다. 실제 팝오버 크기를 재서,
 * 아래 공간이 모자라고 위가 더 넓으면 위로 뒤집고 화면 밖으로 나가지 않게 보정한다
 */
function useAnchoredPosition(
  open: boolean,
  anchor: HTMLElement | null,
  popRef: RefObject<HTMLElement | null>,
) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      const w = popRef.current?.offsetWidth ?? 0;
      const h = popRef.current?.offsetHeight ?? 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spaceBelow = vh - r.bottom - POP_GAP - POP_MARGIN;
      const spaceAbove = r.top - POP_GAP - POP_MARGIN;
      const flip = h > spaceBelow && spaceAbove > spaceBelow;
      const top = flip ? r.top - POP_GAP - h : r.bottom + POP_GAP;
      setPos({
        top: Math.max(POP_MARGIN, Math.min(top, vh - h - POP_MARGIN)),
        left: Math.max(POP_MARGIN, Math.min(r.left, vw - w - POP_MARGIN)),
      });
    };
    update();
    // 달을 넘기면 주 수(5·6주)에 따라 높이가 바뀌므로 다시 잰다
    const ro = new ResizeObserver(update);
    if (popRef.current) ro.observe(popRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchor, popRef]);
  return pos;
}

export function DateField({
  value,
  onChange,
  placeholder = "날짜 선택",
  disabled,
  className = "",
  clearable,
  holidays,
  id,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(open, triggerRef.current, popRef);

  const selected = value ? parseDate(value) : undefined;
  const holidayDates = holidays?.map(parseDate);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t))
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`date-field-trigger ${value ? "has-value" : ""} ${className}`}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="date-field-text">
          {selected ? (
            format(selected, "yyyy. MM. dd.")
          ) : (
            <span className="date-field-ph">{placeholder}</span>
          )}
        </span>
        {clearable && value && (
          <span
            className="date-field-clear"
            role="button"
            aria-label="날짜 지우기"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setOpen(false);
            }}
          >
            ✕
          </span>
        )}
      </button>

      {open &&
        createPortal(
          // 크기를 재야 위치를 정할 수 있으므로, 위치가 잡히기 전에는 숨긴 채로 렌더한다
          <div
            ref={popRef}
            className="date-field-pop"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? undefined : "hidden",
              zIndex: 200,
            }}
          >
            <DayPicker
              mode="single"
              locale={ko}
              selected={selected}
              defaultMonth={selected}
              showOutsideDays
              fixedWeeks
              modifiers={holidayDates ? { holiday: holidayDates } : undefined}
              modifiersClassNames={{ holiday: "rdp-holiday" }}
              onSelect={(d) => {
                onChange(d ? fmt(d) : undefined);
                setOpen(false);
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
