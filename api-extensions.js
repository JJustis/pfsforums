// API Extensions
// Add these API methods to app.js or include in api.js

// Get articles list
async getArticles(token) {
    return await this.callApi('article-api.php', 'get_articles', { token });
},

// Get single article
async getArticle(id, token) {
    return await this.callApi('article-api.php', 'get_article', { id, token });
},

// Save article
async saveArticle(data) {
    return await this.callApi('article-api.php', 'save_article', data);
},

// Delete article
async deleteArticle(id, token) {
    return await this.callApi('article-api.php', 'delete_article', { id, token });
},

// Get federation status
async getFederationStatus(token) {
    return await this.callApi('api.php', 'federation_status', { token });
},