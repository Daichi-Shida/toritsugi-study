"use client";

interface Props {
  total: number;
  answers: (number | null)[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function QuestionNavigator({ total, answers, currentIndex, onSelect, onClose, onSubmit }: Props) {
  const unanswered = answers.filter((a) => a === null).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
      <div className="mt-auto bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">問題一覧</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>未回答 <span className={unanswered > 0 ? "text-amber-600 font-bold" : ""}>{unanswered}問</span></span>
            <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          <div className="grid grid-cols-8 gap-2">
            {answers.map((a, i) => (
              <button
                key={i}
                onClick={() => onSelect(i)}
                className={`aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${
                  i === currentIndex
                    ? "bg-primary-500 text-white"
                    : a !== null
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex gap-3">
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-1">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-primary-100 inline-block"></span>回答済</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-100 inline-block"></span>未回答</span>
          </div>
          <button onClick={onSubmit} className="btn-primary text-sm px-5 py-2">
            提出する
          </button>
        </div>
      </div>
    </div>
  );
}
