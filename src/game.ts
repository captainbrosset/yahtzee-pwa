import { v4 as uuidv4 } from "uuid";

export const EventBus: {
  emit: (eventName: string, ...args: any[]) => void;
  on: (eventName: string, cb: Function) => void;
  listeners: {eventName: string, cb: Function}[];
} = {
  emit(eventName: string, ...args: any[]) {
    for (const listener of this.listeners) {
      if (listener.eventName === eventName) {
        listener.cb(eventName, ...args);
      }
    }
  },
  on(eventName: string, cb: Function) {
    this.listeners.push({ eventName, cb });
  },
  listeners: [],
};

const RULES = {
  MAX_THROWS: 3,
  THREE_FOUR_OF_A_KIND_TOTAL_INSTEAD: false,
};

const SCORES = {
  THREE_OF_A_KIND: 20,
  FOUR_OF_A_KIND: 40,
  FULL_HOUSE: 30,
  SMALL_STRAIGHT: 30,
  LARGE_STRAIGHT: 40,
  YAHTZEE: 50,
  BONUS: 35,
  BONUS_THRESHOLD: 63,
};

enum StraightKinds {
  Small = 4,
  Large = 5,
}

enum Categories {
  Ones,
  Twos,
  Threes,
  Fours,
  Fives,
  Sixes,
  ThreeOfAKind,
  FourOfAKind,
  FullHouse,
  SmallStraight,
  LargeStraight,
  Chance,
  Yahtzee,
}

function isValidDieValue(num: number): boolean {
  return num >= 1 && num <= 6;
}

function howManyDiceWithValue(num: number, hand: Hand): number {
  let found = 0;

  for (const { value } of hand.dice) {
    if (value === num) {
      found++;
    }
  }

  return found;
}

interface Category {
  score: number;
  name: Categories;
}

class CancelledCategory implements Category {
  score: number = 0;
  name: Categories;

  constructor(name: Categories) {
    this.name = name;
  }
}

class Nums implements Category {
  num: number;
  hand: Hand;

  constructor(num: number, hand: Hand) {
    if (!isValidDieValue(num)) {
      throw new Error(`${num} isn't a valid die number`);
    }

    if (!hand.asListOfValues.some((v) => v === num)) {
      throw new Error(`Cannot do a sequence of ${num} without any of them`);
    }

    this.num = num;
    this.hand = hand;
  }

  get name() {
    return [
      Categories.Ones,
      Categories.Twos,
      Categories.Threes,
      Categories.Fours,
      Categories.Fives,
      Categories.Sixes,
    ][this.num - 1];
  }

  get score(): number {
    const found = howManyDiceWithValue(this.num, this.hand);
    return this.num * found;
  }

  toString(): string {
    return `Sequence of ${this.num}s, got ${howManyDiceWithValue(
      this.num,
      this.hand
    )}, score = ${this.score}`;
  }
}

class ThreeAndFourOfAKind implements Category {
  type: number;
  hand: Hand;

  constructor(num: number, type: number, hand: Hand) {
    if (!isValidDieValue(num)) {
      throw new Error(`${num} isn't a valid die number`);
    }

    if (type !== 3 && type !== 4) {
      throw new Error(
        `Category must be either a 3 or a 4 of a kind, got ${type} instead`
      );
    }

    const found = howManyDiceWithValue(num, hand);
    if (found < type) {
      throw new Error(
        `Got ${found} times the number ${num} only, need at least ${type}`
      );
    }

    this.type = type;
    this.hand = hand;
  }

  get score(): number {
    if (RULES.THREE_FOUR_OF_A_KIND_TOTAL_INSTEAD) {
      return this.hand.asListOfValues.reduce(
        (acc, current) => acc + current,
        0
      );
    }
    return this.type === 3 ? SCORES.THREE_OF_A_KIND : SCORES.FOUR_OF_A_KIND;
  }

  get name() {
    return this.type === 3 ? Categories.ThreeOfAKind : Categories.FourOfAKind;
  }

  toString(): string {
    return `${this.type} of a kind, score = ${this.score}`;
  }
}

class FullHouse implements Category {
  name: Categories = Categories.FullHouse;

  constructor(hand: Hand) {
    const values = [...new Set(hand.asListOfValues)];
    if (values.length > 2) {
      throw new Error(`A full house can only have 2 different values`);
    }

    const nb = howManyDiceWithValue(values[0], hand);
    if (nb !== 2 && nb !== 3) {
      throw new Error(
        `Invalid full house, must have 2 dice with one value, and 3 with the other`
      );
    }
  }

  get score(): number {
    return SCORES.FULL_HOUSE;
  }

  toString(): string {
    return `Full house, score = ${this.score}`;
  }
}

class Straight implements Category {
  kind: StraightKinds;

  constructor(kind: StraightKinds, hand: Hand) {
    const numbers = hand.asListOfValues.sort();
    let straightCandidates = [];

    for (const nb of numbers) {
      // First time, just add a brand new straight.
      if (!straightCandidates.length) {
        straightCandidates.push([nb]);
        continue;
      }

      // Find an existing straight that this number can work with.
      let found = false;
      for (const straight of straightCandidates) {
        if (nb === straight[straight.length - 1] + 1) {
          // Found one! Add to it.
          straight.push(nb);
          found = true;
          break;
        }
      }

      // If not found, create a new one.
      if (!found) {
        straightCandidates.push([nb]);
      }
    }

    if (!straightCandidates.some((c) => c.length >= kind)) {
      throw new Error(`This straight requires at least ${kind} numbers`);
    }

    this.kind = kind;
  }

  get score(): number {
    return this.kind === StraightKinds.Small
      ? SCORES.SMALL_STRAIGHT
      : SCORES.LARGE_STRAIGHT;
  }

  get name() {
    return this.kind === StraightKinds.Small
      ? Categories.SmallStraight
      : Categories.LargeStraight;
  }

  toString(): string {
    return `${
      this.kind === StraightKinds.Small ? "Small" : "Large"
    } straight, score = ${this.score}`;
  }
}

class Chance implements Category {
  name: Categories = Categories.Chance;
  hand: Hand;

  constructor(hand: Hand) {
    this.hand = hand;
  }

  get score(): number {
    return this.hand.asListOfValues.reduce((acc, current) => acc + current, 0);
  }

  toString(): string {
    return `Chance, score = ${this.score}`;
  }
}

class Yahtzee implements Category {
  name: Categories = Categories.Yahtzee;
  hand: Hand;

  constructor(hand: Hand) {
    const found = howManyDiceWithValue(hand.dice[0].value, hand);
    if (found < 5) {
      throw new Error(`Yahtzee requires 5 dice with the same value`);
    }

    this.hand = hand;
  }

  get score(): number {
    return SCORES.YAHTZEE;
  }

  toString(): string {
    return `Yahtzee!! score = ${this.score}`;
  }
}

function getPossibleCategories(hand: Hand): Array<Category> {
  // Let's create all of the possible categories.
  const categories = [];

  for (let i = 1; i < 7; i++) {
    // All the possible number sequences.
    try {
      categories.push(new Nums(i, hand));
    } catch (e) {}

    // All the possible 3 of a kind.
    try {
      categories.push(new ThreeAndFourOfAKind(i, 3, hand));
    } catch (e) {}

    // All the possible 4 of a kind.
    try {
      categories.push(new ThreeAndFourOfAKind(i, 4, hand));
    } catch (e) {}
  }

  // The small straight.
  try {
    categories.push(new Straight(StraightKinds.Small, hand));
  } catch (e) {}

  // The large straight.
  try {
    categories.push(new Straight(StraightKinds.Large, hand));
  } catch (e) {}

  // The full house.
  try {
    categories.push(new FullHouse(hand));
  } catch (e) {}

  // The chance.
  categories.push(new Chance(hand));

  // The yahtzee.
  try {
    categories.push(new Yahtzee(hand));
  } catch (e) {}

  return categories;
}

class ScoreBoard {
  categories: Array<Category> = [];

  addCategory(newCategory: Category) {
    if (this.hasCategory(newCategory.name)) {
      console.warn(`Category ${newCategory.name} has already been done`);
      return;
    }

    this.categories.push(newCategory);
  }

  hasCategory(name: Categories): boolean {
    for (const doneCategory of this.categories) {
      if (doneCategory.name === name) {
        return true;
      }
    }

    return false;
  }

  get hasBonus(): boolean {
    let totalNums = 0;

    for (const category of this.categories) {
      if (category instanceof Nums) {
        totalNums += category.score;
      }
    }

    return totalNums >= SCORES.BONUS_THRESHOLD;
  }

  get total(): number {
    const bonus = this.hasBonus ? SCORES.BONUS : 0;

    return (
      bonus +
      this.categories
        .map((category) => category.score)
        .reduce((acc, current) => acc + current, 0)
    );
  }

  isThereAnyCategoryLeft(): boolean {
    return this.categories.length < Object.keys(Categories).length / 2;
  }

  availableCategoryNames(): Categories[] {
    const remaining: Categories[] = [];

    for (let name in Categories) {
      if (isNaN(Number(name))) {
        if (!this.hasCategory((<any>Categories)[name])) {
          remaining.push(<any>Categories[name]);
        }
      }
    }

    return remaining;
  }
}

class Player {
  name: string;
  id: string;
  nbOfThrows: number = 0;
  hand: Hand = new Hand();
  scoreBoard: ScoreBoard = new ScoreBoard();
  currentCategories: Category[] = [];
  done: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.id = uuidv4();
  }

  async newRound() {
    EventBus.emit("state-changed");

    if (this.done) {
      console.warn(`${this.name} is done, no more throws`);
      return;
    }

    this.nbOfThrows = 0;
    this.hand = new Hand();
    this.currentCategories = [];

    // Do the first throw.
    // Ask which dice the player wants to throw. This is async, as there will be hand off
    // here with the UI, and we'll be waiting for the user to make a choice.
    await this.askWhichDiceToThrow();
    await this.throw([0, 1, 2, 3, 4]);
  }

  async throw(whichDice: Array<number>) {
    this.nbOfThrows++;

    // Roll the dice.
    this.hand.roll(whichDice);

    console.log(`${this.name} - Got these values:`, this.hand.asListOfValues);

    this.currentCategories = getPossibleCategories(this.hand);
    this.currentCategories = this.currentCategories.filter(
      (category) => !this.scoreBoard.hasCategory(category.name)
    );

    console.log(
      `${this.name} - You could do\n`,
      this.currentCategories.map((f, i) => `\n* ${i}: ${f}`).join("")
    );

    const [
      throwAgain,
      whichDiceToThrowAgain,
      category,
    ] = await this.askSelectCancelOrThrowAgain();

    if (throwAgain && this.canThrow) {
      await this.throw(whichDiceToThrowAgain as Array<number>);
    } else {
      await this.endRound(category as Category);
    }
  }

  get canThrow(): boolean {
    return this.nbOfThrows < RULES.MAX_THROWS;
  }

  askWhichDiceToThrow(): Promise<Array<number>> {
    return new Promise((resolve) => {
      EventBus.emit("state-changed", {
        selectDice: resolve,
      });
    });
  }

  askSelectCancelOrThrowAgain(): Promise<[boolean, Array<number>|null, Category|null]> {
    return new Promise((resolve) => {
      EventBus.emit("state-changed", {
        selectCategoryToAdd: (name: Categories) => {
          // The index here is relative to the list of categories in the Categories enum.
          // Need to find which category inside this.currentCategories it corresponds to.
          const category = this.currentCategories.find((f) => f.name === name) || null;
          resolve([false, null, category]);
        },
        selectCategoryToCancel: (name: Categories) => {
          resolve([false, null, new CancelledCategory(name)]);
        },
        selectDice: (whichDice: Array<number>) => {
          resolve([true, whichDice, null]);
        },
      });
    });
  }

  endRound(category: Category) {
    console.warn("Done throwing");

    this.scoreBoard.addCategory(category);

    console.log("score", this.scoreBoard);

    // If there are no categories left, player is done.
    if (!this.scoreBoard.isThereAnyCategoryLeft()) {
      this.endGame();
    }
  }

  endGame() {
    this.done = true;
  }

  getUserActionsAfterAThrow(resolve: (value: Category | PromiseLike<Category>) => void) {
    return {
      selectCategoryToAdd: (index: number) => {
        // TODO: the index passed here will need to match the this.currentCategories array
        resolve(this.currentCategories[index]);
      },
      selectCategoryToCancel: (index: number) => {
        // TODO: the index passed here will need to match the
        // this.scoreBoard.availableCategoryNames array
        const available: Categories[] = this.scoreBoard.availableCategoryNames();
        resolve(new CancelledCategory(available[index]));
      },
    };
  }

  askWhichCategoryToSelectOrCancel(): Promise<Category> {
    return new Promise((resolve) => {
      EventBus.emit("state-changed", this.getUserActionsAfterAThrow(resolve));
    });
  }
}

class Die {
  value: number = -1;

  roll(): number {
    this.value = Math.ceil(Math.random() * 6);
    return this.value;
  }
}

class Hand {
  dice: Array<Die>;
  rolled: number;

  constructor() {
    this.rolled = 0;
    this.dice = [new Die(), new Die(), new Die(), new Die(), new Die()];
  }

  roll(toRoll: Array<number>) {
    this.rolled++;
    if (this.rolled > RULES.MAX_THROWS) {
      console.error(`Rolled more than ${RULES.MAX_THROWS} times`);
      return this.dice;
    }

    for (const index of toRoll) {
      this.dice[index].roll();
    }

    EventBus.emit("state-changed");
  }

  get asListOfValues() {
    return this.dice.map((d) => d.value);
  }
}

export class Game {
  players: Array<Player> = [];
  currentPlayerIndex: number = -1;
  hasStarted: boolean = false;

  addPlayer(name: string) {
    this.players.push(new Player(name));

    EventBus.emit("state-changed");
  }

  start() {
    console.log("The game starts");
    this.hasStarted = true;
    this.currentPlayerIndex = -1;

    EventBus.emit("state-changed");

    this.playNextRound();
  }

  stop() {
    console.log("the game ends");
    this.hasStarted = false;

    EventBus.emit("state-changed");
  }

  get isDone() {
    return this.players.every((p) => p.done);
  }

  get currentPlayer() {
    if (this.currentPlayerIndex > this.players.length - 1) {
      this.currentPlayerIndex = 0;
    }
    return this.players[this.currentPlayerIndex];
  }

  get leaders(): Array<Player> {
    let leaders: Array<Player> = [];

    for (const player of this.players) {
      if (
        !leaders.length ||
        player.scoreBoard.total > leaders[0].scoreBoard.total
      ) {
        leaders = [player];
        continue;
      }

      if (player.scoreBoard.total === leaders[0].scoreBoard.total) {
        leaders.push(player);
      }
    }

    return leaders;
  }

  async playNextRound() {
    // Advance to the next player.
    this.currentPlayerIndex++;

    // Let this player play a round.
    await this.currentPlayer.newRound();

    EventBus.emit("state-changed");

    // If the game is done, stop here.
    if (this.isDone) {
      this.stop();
    } else {
      await this.playNextRound();
    }
  }

  get state(): Object {
    return {
      hasStarted: this.hasStarted,
      isDone: this.isDone,
      currentPlayer: this.currentPlayer,
      leaders: this.leaders,
      players: this.players.map((p) => {
        const isCurrent =
          this.currentPlayer && this.currentPlayer.id === p.id;

        const categories = [];
        for (let name in Categories) {
          if (isNaN(Number(name))) {
            const doneCategory: Category|undefined = p.scoreBoard.categories.find(
              (f) => f.name === (<any>Categories)[name]
            );
            const possibleCategory: Category|undefined = p.currentCategories.find(
              (f) => f.name === (<any>Categories)[name]
            );

            categories.push({
              name,
              isAlreadyDone: !!doneCategory,
              score: doneCategory ? doneCategory.score : 0,
              isSelectable: this.hasStarted && !!possibleCategory,
              scoreIfSelected: possibleCategory ? possibleCategory.score : 0,
            });
          }
        }

        return {
          name: p.name,
          score: p.scoreBoard.total,
          hasBonus: p.scoreBoard.hasBonus,
          bonusAmount: SCORES.BONUS,
          isCurrent,
          remainingThrows: RULES.MAX_THROWS - p.nbOfThrows,
          categories,
        };
      }),
      currentHand:
        this.currentPlayer &&
        this.currentPlayer.hand.asListOfValues.map((value) => {
          return {
            name: ["one", "two", "three", "four", "five", "six"][value - 1],
            index: value,
          };
        }),
    };
  }
}
