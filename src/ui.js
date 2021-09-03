import {EventBus, Game} from './game';

const CATEGORY_NAMES = {
  Ones: "Aces",
  Twos: "Twos",
  Threes: "Threes",
  Fours: "Fours",
  Fives: "Fives",
  Sixes: "Sixes",
  ThreeOfAKind: "3 of a kind",
  FourOfAKind: "4 of a kind",
  FullHouse: "Full house",
  SmallStraight: "Sm straight",
  LargeStraight: "Lg straight",
  Chance: "Chance",
  Yahtzee: "Yahtzee",
};

var vueApp = new Vue({
  el: "#app",
  data: {
    game: null,
    actions: null,
  },
  methods: {
    translate: function (categoryName) {
      return CATEGORY_NAMES[categoryName];
    },
    onDieClick: function (event) {
      if (this.game.isDone) {
        return;
      }
      event.target.classList.toggle("selected");
    },
    onCategorySelectClick: function (index) {
      this.actions.selectCategoryToAdd(index);
    },
    onCategoryCancelClick: function (index) {
      this.actions.selectCategoryToCancel(index);
    },
    selectDice: function () {
      const indices = [];
      document.querySelectorAll(".die").forEach((die, index) => {
        if (die.classList.contains("selected")) {
          indices.push(index);
        }
      });

      if (indices.length) {
        this.actions.selectDice(indices);
      } else {
        this.actions.selectDice([0, 1, 2, 3, 4]);
      }

      document
        .querySelectorAll(".die.selected")
        .forEach((d) => d.classList.remove("selected"));
    },
  },
});

document
  .querySelector(".start-screen input")
  .addEventListener("keypress", ({ key, target }) => {
    if (key === "Enter" && target.value) {
      const game = new Game();

      const names = target.value.split(" ").filter(n => !!n);
      for (const name of names) {
        game.addPlayer(name);
      }

      EventBus.on("state-changed", (e, actions = {}) => {
        vueApp.game = game.state;
        vueApp.actions = actions;
      });

      game.start();

      target.closest(".start-screen").remove();
    }
  });
