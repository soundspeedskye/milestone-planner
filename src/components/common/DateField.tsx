import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** 팝오버 위치를 트리거 기준으로 잡되 화면 밖으로 나가지 않게 살짝 보정한다 */
function useAnchoredPosition(open: boolean, anchor: HTMLElement | null) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      const W = 280;
      const left = Math.min(r.left, window.innerWidth - W - 8);
      setPos({ top: r.bottom + 4, left: Math.max(8, left) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchor]);
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
  const pos = useAnchoredPosition(open, triggerRef.current);

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
        pos &&
        createPortal(
          <div
            ref={popRef}
            className="date-field-pop"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 200,
            }}
          >
            <DayPicker
              mode="single"
              locale={ko}
              selected={selected}
              defaultMonth={selected}
              showOutsideDays
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
