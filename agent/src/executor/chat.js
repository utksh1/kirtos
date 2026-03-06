class ChatExecutor {



  async execute(intent, params) {


    return {
      status: 'success',

      message: null,
      type: 'chat'
    };
  }
}

module.exports = new ChatExecutor();