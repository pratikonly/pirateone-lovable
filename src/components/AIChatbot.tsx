import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, User, Film, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  movies?: { id: number; title: string; poster: string | null; rating: string; year: string; mediaType: string }[];
}

const SUGGESTIONS = ['Suggest a thriller movie', 'Best anime to binge', 'Something like Breaking Bad'];

const AIChatbot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const sendMessage = async (text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!user) {
      setMessages(prev => [...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: 'Please sign in to use the AI recommender!' }
      ]);
      setInput('');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('chat-recommend', {
        body: { message: trimmed, history },
      });

      if (error) throw new Error(error.message || 'Request failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.response) throw new Error('No response received');

      setMessages(prev => [...prev, { role: 'assistant', content: data.response, movies: data.movies }]);
    } catch (err: any) {
      const msg = err?.message || '';
      const display = msg.includes('Rate limit') ? '⚡ Rate limit hit — please wait a moment and try again.'
        : msg.includes('credits') ? '💳 AI credits exhausted. Try again later.'
        : msg.includes('AI') || msg.includes('service') ? '🔧 AI service is temporarily unavailable.'
        : '❌ Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: display }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">AI Recommender</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="font-medium">What should you watch?</p>
            <p className="text-xs mt-1">Ask me for movie & TV recommendations!</p>
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} rounded-xl px-3 py-2 text-sm`}>
              <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.movies && msg.movies.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {msg.movies.map(m => (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/watch/${m.mediaType}/${m.id}`)}
                      className="flex items-center gap-2 bg-background/50 rounded-lg p-1.5 hover:bg-background/80 transition-colors text-left"
                    >
                      {m.poster ? (
                        <img src={m.poster} alt={m.title} className="w-8 h-12 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Film className="w-3 h-3" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground">⭐ {m.rating} · {m.year}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && <User className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <Sparkles className="w-5 h-5 text-primary mt-1" />
            <div className="bg-muted rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for recommendations..."
            className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatbot;
