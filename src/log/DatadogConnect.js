var Client = require("node-rest-client").Client;
const { dd_env } = require("../utils/env_loader");

class DatadogConnect {
  constructor(config) {
    this.config = Object.assign(config, dd_env());

    this.client = new Client();
    this.headers = {
      "Content-Type": "application/json",
      "DD-API-KEY": config.dd_apikey,
      "DD-APPLICATION-KEY": config.dd_applicationkey,
    };
  }

  async get_log_by_query(query, from, to, cursor) {
    if (!to) {
      to = new Date().toISOString();
    }
    var data = {
      filter: {
        from: from,
        to: to,
        query: query,
      },
      options: {
        timezone: this.config.timezone ? this.config.timezone : "UTC+09:00",
      },
      page: {
        limit: 5000,
      },
      sort: "timestamp",
    };

    if (cursor) {
      data.page.cursor = cursor;
    }

    var args = {
      data: data,
      headers: this.headers,
    };

    return await this.executePost(
      "https://api.datadoghq.com/api/v2/logs/events/search",
      args
    );
  }

  async get_log(application, from, to, cursor) {
    query = "service.application host:" + application;
    return await this.getLogByQuery(query, from, to, cursor);
  }

  transform(data) {
    const targetKeys = this.config.target_keys.split(",");
    return data.data.map((d) => {
      var log = {};
      var l = d.attributes;
      for (const ley of targetKeys) {
        if (key in l) {
          log[key] = l[key];
        }
        if (key in l.attributes) {
          log[key] = l.attributes[key];
        }
      }
      return log;
    });
  }

  get_next(data) {
    if ("meta" in data) {
      if ("page" in data.meta) {
        return data.meta.page.after;
      }
    }
  }

  executePost(uri, args) {
    return new Promise((resolve, reject) => {
      this.client.post(uri, args, function (data, response) {
        resolve(data);
      });
    });
  }
}

module.exports = DatadogConnect;