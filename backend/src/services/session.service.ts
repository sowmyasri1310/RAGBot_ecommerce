import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionState {
  currentProduct: string | null;
  conversationHistory: ChatMessage[];
  lastRetrievedSources: any[];
}

export class SessionService {
  private static sessions: Map<string, SessionState> = new Map();

  /**
   * Returns or initializes the session state for a given sessionId.
   */
  public static getSession(sessionId: string): SessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      logger.info(`Initializing new chatbot session: '${sessionId}'`);
      session = {
        currentProduct: null,
        conversationHistory: [],
        lastRetrievedSources: []
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  /**
   * Sets the currently discussed product for a session.
   */
  public static setCurrentProduct(sessionId: string, productName: string | null): void {
    const session = this.getSession(sessionId);
    if (session.currentProduct !== productName) {
      logger.info(`Session '${sessionId}' active product context updated: '${productName}'`);
      session.currentProduct = productName;
    }
  }

  /**
   * Appends user and assistant messages to the session's chat history.
   */
  public static addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.getSession(sessionId);
    session.conversationHistory.push({ role, content });
    
    // Cap history length at last 10 messages for performance and context window efficiency
    if (session.conversationHistory.length > 10) {
      session.conversationHistory.shift();
    }
  }

  /**
   * Updates the list of last retrieved sources for a session.
   */
  public static setLastSources(sessionId: string, sources: any[]): void {
    const session = this.getSession(sessionId);
    session.lastRetrievedSources = sources;
  }

  /**
   * Resets session memory.
   */
  public static clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info(`Session state '${sessionId}' cleared.`);
  }
}
