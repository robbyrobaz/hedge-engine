import { useState } from 'react';
import { useArbStore } from '../store/useArbStore';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function PresetManager() {
  const { presets, savePreset, loadPreset, deletePreset, renamePreset } = useArbStore();

  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleSave() {
    if (!saveName.trim()) return;
    savePreset(saveName.trim());
    setSaveName('');
    setIsSaving(false);
  }

  function handleStartRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
    setConfirmDeleteId(null);
  }

  function handleRenameSubmit(id: string) {
    renamePreset(id, renameValue);
    setRenamingId(null);
  }

  function handleDeleteClick(id: string) {
    if (confirmDeleteId === id) {
      deletePreset(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setRenamingId(null);
    }
  }

  return (
    <div className="preset-manager">
      <div className="preset-manager-bar">
        <div className="preset-bar-left">
          <span className="preset-label">⬡ Presets</span>
          {presets.length === 0 && !isSaving && (
            <span className="preset-empty-hint">
              Save your promo setup to quickly restore it later
            </span>
          )}
          {presets.length > 0 && (
            <div className="preset-list">
              {presets.map(preset => (
                <div key={preset.id} className="preset-item">
                  {renamingId === preset.id ? (
                    <form
                      className="preset-rename-form"
                      onSubmit={e => { e.preventDefault(); handleRenameSubmit(preset.id); }}
                    >
                      <input
                        className="preset-rename-input"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        autoFocus
                        onBlur={() => handleRenameSubmit(preset.id)}
                        onKeyDown={e => e.key === 'Escape' && setRenamingId(null)}
                      />
                    </form>
                  ) : (
                    <button
                      className="preset-name-btn"
                      onClick={() => loadPreset(preset.id)}
                      title={`Load "${preset.name}" — saved ${timeAgo(preset.savedAt)}`}
                    >
                      <span className="preset-name">{preset.name}</span>
                      <span className="preset-age">{timeAgo(preset.savedAt)}</span>
                    </button>
                  )}

                  <div className="preset-actions">
                    <button
                      className="preset-action-btn preset-load-btn"
                      onClick={() => loadPreset(preset.id)}
                      title="Load preset"
                    >
                      ↩ Load
                    </button>
                    <button
                      className="preset-action-btn preset-rename-btn"
                      onClick={() => handleStartRename(preset.id, preset.name)}
                      title="Rename preset"
                    >
                      ✎
                    </button>
                    <button
                      className={`preset-action-btn preset-delete-btn ${confirmDeleteId === preset.id ? 'preset-delete-btn--confirm' : ''}`}
                      onClick={() => handleDeleteClick(preset.id)}
                      title={confirmDeleteId === preset.id ? 'Click again to confirm delete' : 'Delete preset'}
                      onBlur={() => setTimeout(() => setConfirmDeleteId(null), 200)}
                    >
                      {confirmDeleteId === preset.id ? '✓ Confirm' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="preset-bar-right">
          {isSaving ? (
            <form
              className="preset-save-form"
              onSubmit={e => { e.preventDefault(); handleSave(); }}
            >
              <input
                className="preset-save-input"
                placeholder="Preset name…"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Escape' && (setIsSaving(false), setSaveName(''))}
                maxLength={40}
              />
              <button
                type="submit"
                className="preset-action-btn preset-confirm-btn"
                disabled={!saveName.trim()}
              >
                Save
              </button>
              <button
                type="button"
                className="preset-action-btn preset-cancel-btn"
                onClick={() => { setIsSaving(false); setSaveName(''); }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="btn-save-preset"
              onClick={() => { setIsSaving(true); setConfirmDeleteId(null); }}
            >
              + Save Current
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
