const https = require("https");
const fs = require("fs");
const { argv, exit } = require("process");

const CONFIG = {
  api: {
    host: "icanhazdadjoke.com",
    headers: {
      Accept: "application/json",
      "User-Agent": "Node.js CLI App (Learning Project)",
    },
  },
  files: {
    jokes: "jokes.json",
  },
  messages: {
    usage: `
Использование:
  node app.js --searchTerm "термин"  - поиск шутки
  node app.js --leaderboard         - топ шуток
`,
    noJokesFound: (term) => `Не найдено шуток по теме: ${term}`,
    jokeSaved: "Шутка сохранена в jokes.json",
    fileError: "Ошибка работы с файлом:",
    requestError: "Ошибка запроса:",
    processingError: "Ошибка обработки ответа:",
    noJokesFile: "Файл с шутками не найден. Сначала найдите несколько шуток!",
    emptyJokesFile: "В файле нет шуток. Сначала найдите несколько шуток!",
    leaderboardTitle: "\nТоп популярных шуток:",
  },
};

class JokeApp {
  static run() {
    const args = argv.slice(2);

    if (args.length === 0) {
      console.log(CONFIG.messages.usage);
      exit(1);
    }

    if (args[0] === "--searchTerm" && args[1]) {
      this.searchForJoke(args[1]);
    } else if (args[0] === "--leaderboard") {
      this.showLeaderboard();
    } else {
      console.log(CONFIG.messages.usage);
      exit(1);
    }
  }

  static searchForJoke(term) {
    console.log(`Ищем шутки по теме: ${term}...`);

    const options = {
      hostname: CONFIG.api.host,
      path: `/search?term=${encodeURIComponent(term)}`,
      method: "GET",
      headers: CONFIG.api.headers,
    };

    const request = https.request(options, async (response) => {
      try {
        const data = await this.collectResponseData(response);
        const result = JSON.parse(data);

        if (result.results?.length > 0) {
          const randomJoke = this.getRandomJoke(result.results);
          this.displayAndSaveJoke(randomJoke.joke);
        } else {
          console.log(CONFIG.messages.noJokesFound(term));
        }
      } catch (error) {
        console.error(CONFIG.messages.processingError, error.message);
      }
    });

    request.on("error", (error) => {
      console.error(CONFIG.messages.requestError, error.message);
    });

    request.end();
  }

  static collectResponseData(response) {
    return new Promise((resolve, reject) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => resolve(data));
      response.on("error", (error) => {
        console.error("Ошибка:", error.message);
        reject(error);
      });
    });
  }

  static getRandomJoke(jokes) {
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  static displayAndSaveJoke(joke) {
    console.log("\nНайдена шутка:");
    console.log(joke);
    this.saveJoke(joke);
  }

  static saveJoke(joke) {
    try {
      const jokes = this.loadJokes();
      jokes.push(joke);
      this.writeJokes(jokes);
      console.log(CONFIG.messages.jokeSaved);
    } catch (error) {
      console.error(CONFIG.messages.fileError, error.message);
    }
  }

  static loadJokes() {
    return fs.existsSync(CONFIG.files.jokes)
      ? JSON.parse(fs.readFileSync(CONFIG.files.jokes, "utf8"))
      : [];
  }

  static writeJokes(jokes) {
    fs.writeFileSync(
      CONFIG.files.jokes,
      JSON.stringify(jokes, null, 2),
      "utf8"
    );
  }

  static showLeaderboard() {
    try {
      const jokes = this.loadJokes();

      if (jokes.length === 0) {
        console.log(CONFIG.messages.emptyJokesFile);
        return;
      }

      const jokeStats = this.analyzeJokes(jokes);
      this.displayLeaderboard(jokeStats);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(CONFIG.messages.noJokesFile);
      } else {
        console.error(CONFIG.messages.fileError, error.message);
      }
    }
  }

  static analyzeJokes(jokes) {
    const counts = new Map();

    jokes.forEach((joke) => {
      counts.set(joke, (counts.get(joke) || 0) + 1);
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }

  static displayLeaderboard(stats) {
    console.log(CONFIG.messages.leaderboardTitle);
    stats.forEach(([joke, count], index) => {
      console.log(`${index + 1}. ${joke} (${count} раз)`);
    });
  }
}

JokeApp.run();
