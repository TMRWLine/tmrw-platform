import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessagesSquare, AlertCircle } from 'lucide-react';
import type { Message, SenderType } from '../types';
import { fetchMessages, sendMessage } from '../api';

export function MessageThread({
  agreementId,
  athleteName,
}: {
  agreementId: string | null;
  athleteName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [senderType, setSenderType] = useState<SenderType>('sponsor');
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!agreementId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMessages(agreementId);
      setMessages(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [agreementId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || !agreementId || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendMessage(agreementId, senderType, trimmed);
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (!agreementId) {
    return (
      <div className="ledger-section">
        <div className="ledger-head">
          <MessagesSquare size={16} />
          <h3>Message History</h3>
        </div>
        <p className="ledger-desc">
          No active agreement. Messaging becomes available once a sponsorship deal is in place
          with {athleteName}.
        </p>
      </div>
    );
  }

  return (
    <div className="ledger-section">
      <div className="ledger-head">
        <MessagesSquare size={16} />
        <h3>Message History &amp; Audit Log</h3>
      </div>
      <p className="ledger-desc">
        Direct pitch responses and negotiation messages tied to this agreement. All messages are
        timestamped and retained for compliance audit purposes.
      </p>

      <div className="msg-thread" ref={scrollRef}>
        {loading && (
          <div className="msg-empty">
            <Loader2 size={16} className="spin" /> Loading messages…
          </div>
        )}
        {error && (
          <div className="msg-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="msg-empty">
            <MessagesSquare size={20} />
            <span>No messages yet. Start the conversation below.</span>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg-bubble msg-${m.sender_type}`}>
            <div className="msg-sender">
              {m.sender_type === 'sponsor'
                ? 'Sponsor'
                : m.sender_type === 'athlete'
                  ? athleteName
                  : 'Platform'}
            </div>
            <div className="msg-content">{m.content}</div>
            <div className="msg-time">{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="msg-composer">
        <div className="msg-sender-toggle">
          <button
            className={senderType === 'sponsor' ? 'active' : ''}
            onClick={() => setSenderType('sponsor')}
          >
            As Sponsor
          </button>
          <button
            className={senderType === 'athlete' ? 'active' : ''}
            onClick={() => setSenderType('athlete')}
          >
            As {athleteName.split(' ')[0]}
          </button>
        </div>
        <div className="msg-input-row">
          <textarea
            className="msg-input"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="btn btn-primary btn-sm msg-send-btn"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
          >
            {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
