import React, { useState } from "react";
import { MatchConfig } from "../types";
import { X, Save } from "lucide-react";
import { COLOR_CONFIGS } from "../constants";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: MatchConfig;
  onSave: (newConfig: MatchConfig) => void;
  onReset: () => void;
}

const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onReset,
}) => {
  const [formData, setFormData] = useState<MatchConfig>(config);

  if (!isOpen) return null;

  const handleChange = (key: keyof MatchConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const colorOptions = Object.keys(COLOR_CONFIGS);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Match Settings
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-6">
          {/* Players Configuration */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 pb-1">
              Players
            </h4>

            {/* Player 1 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Player 1
                </label>
                <div className="flex gap-1">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleChange("p1Color", c)}
                      className={`w-4 h-4 rounded-full ${
                        COLOR_CONFIGS[c].dot
                      } ${
                        formData.p1Color === c
                          ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500"
                          : "opacity-40 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Name"
                value={formData.p1Name}
                onChange={(e) => handleChange("p1Name", e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-colors"
              />
              {formData.mode === "doubles" && (
                <input
                  type="text"
                  placeholder="Partner Name"
                  value={formData.p1PartnerName || ""}
                  onChange={(e) =>
                    handleChange("p1PartnerName", e.target.value)
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-colors text-sm"
                />
              )}
            </div>

            {/* Player 2 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Player 2
                </label>
                <div className="flex gap-1">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleChange("p2Color", c)}
                      className={`w-4 h-4 rounded-full ${
                        COLOR_CONFIGS[c].dot
                      } ${
                        formData.p2Color === c
                          ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500"
                          : "opacity-40 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Name"
                value={formData.p2Name}
                onChange={(e) => handleChange("p2Name", e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-red-500 outline-none transition-colors"
              />
              {formData.mode === "doubles" && (
                <input
                  type="text"
                  placeholder="Partner Name"
                  value={formData.p2PartnerName || ""}
                  onChange={(e) =>
                    handleChange("p2PartnerName", e.target.value)
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-red-500 outline-none transition-colors text-sm"
                />
              )}
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 pb-1">
              Rules
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Sets to Win
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleChange("setsToWin", n)}
                    className={`px-4 py-1 rounded text-sm transition-colors ${
                      formData.setsToWin === n
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Scoring Mode
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-1">
                <button
                  onClick={() => handleChange("useAdvantage", true)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    formData.useAdvantage
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Advantage
                </button>
                <button
                  onClick={() => handleChange("useAdvantage", false)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    !formData.useAdvantage
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  No Ad
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Final Set
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-1">
                <button
                  onClick={() => handleChange("finalSetType", "standard")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    formData.finalSetType === "standard"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => handleChange("finalSetType", "superTieBreak")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    formData.finalSetType === "superTieBreak"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Super TB
                </button>
              </div>
            </div>

            {/* Tie Break Customization */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Tie-Break At (Games)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.tieBreakAt}
                  onChange={(e) =>
                    handleChange("tieBreakAt", parseInt(e.target.value) || 6)
                  }
                  className="w-full bg-slate-100 dark:bg-slate-900 rounded p-2 text-center text-sm font-bold dark:text-white border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  TB Points to Win
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.tieBreakPoints}
                  onChange={(e) =>
                    handleChange(
                      "tieBreakPoints",
                      parseInt(e.target.value) || 7
                    )
                  }
                  className="w-full bg-slate-100 dark:bg-slate-900 rounded p-2 text-center text-sm font-bold dark:text-white border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                // Directly trigger parent Reset logic which opens the confirmation modal
                onClose();
                onReset();
              }}
              className="w-full py-3 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded font-bold transition-colors"
            >
              Reset Match
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <Save size={18} /> Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
