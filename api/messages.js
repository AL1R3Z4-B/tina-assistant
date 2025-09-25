// دیتابیس پیشرفته با GitHub Gist
const GIST_ID = '4a0ab1a75a0218c3163223d442cf2e33'; // ID گیت خود را اینجا قرار دهید
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

class TinaDatabase {
  constructor() {
    this.data = null;
  }

  async loadData() {
    try {
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
      const gist = await response.json();
      this.data = JSON.parse(gist.files['tina_chat_database.json'].content);
      return this.data;
    } catch (error) {
      console.error('Error loading data:', error);
      this.data = { users: {}, messages: [], lastMessageId: 0, lastUserId: 0 };
      return this.data;
    }
  }

  async saveData() {
    try {
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'tina_chat_database.json': {
              content: JSON.stringify(this.data, null, 2)
            }
          }
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  async createUser(username, password) {
    await this.loadData();
    
    if (this.data.users[username]) {
      return { success: false, error: 'این نام کاربری قبلاً ثبت شده است' };
    }

    const userId = ++this.data.lastUserId;
    this.data.users[username] = {
      id: userId,
      password: password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await this.saveData();
    return { success: true, userId: userId };
  }

  async loginUser(username, password) {
    await this.loadData();
    
    const user = this.data.users[username];
    if (!user) {
      return { success: false, error: 'نام کاربری یافت نشد' };
    }

    if (user.password !== password) {
      return { success: false, error: 'رمز عبور اشتباه است' };
    }

    user.lastLogin = new Date().toISOString();
    await this.saveData();

    return { success: true, user: user };
  }

  async addMessage(userId, message, username) {
    await this.loadData();
    
    const newMessage = {
      id: ++this.data.lastMessageId,
      userId: userId,
      username: username,
      message: message,
      timestamp: new Date().toISOString(),
      replied: false,
      reply: null,
      replyTimestamp: null
    };

    this.data.messages.push(newMessage);
    await this.saveData();
    return newMessage;
  }

  async addReply(messageId, reply) {
    await this.loadData();
    
    const message = this.data.messages.find(msg => msg.id === parseInt(messageId));
    if (message) {
      message.replied = true;
      message.reply = reply;
      message.replyTimestamp = new Date().toISOString();
      await this.saveData();
      return true;
    }
    return false;
  }

  async getUserReplies(userId) {
    await this.loadData();
    return this.data.messages.filter(msg => msg.userId === userId && msg.replied);
  }

  async getUnrepliedMessages() {
    await this.loadData();
    return this.data.messages.filter(msg => !msg.replied);
  }

  async getAllUsers() {
    await this.loadData();
    return this.data.users;
  }
}

module.exports = new TinaDatabase();
