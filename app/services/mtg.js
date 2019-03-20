import { copy } from '@ember/object/internals';
import { readOnly } from '@ember/object/computed';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';
import { computed } from '@ember/object';
import Service from '@ember/service';
import { sortInOrder, sortByValue, sortByIndex } from 'mtg-tools/utils/sorting';
import { TYPE_ORDER } from 'mtg-tools/utils/opinions';

const normalize = str =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace('’', "'");

const firstMatch = (allSets, test) => {
  const allSetCodes = Object.keys(allSets).reverse();
  let foundCard = null;
  // For performance, we want to break out of the loop as soon as a match is found.
  // So to do this, we're doing an old-fashioned for loop here.
  for (let i = 0; i < allSetCodes.length; i += 1) {
    if (foundCard) {
      break;
    }
    let cards = allSets[allSetCodes[i]].cards;
    for (let j = 0; j < cards.length; j += 1) {
      if (test(cards[j])) {
        foundCard = cards[j];
        break;
      }
    }
  }
  return foundCard;
};

const firstType = card => card.types.find(x => TYPE_ORDER.includes(x));
export const decklistSort = (a, b) => {
  const [aPrinting] = a.printings;
  const [bPrinting] = b.printings;
  return sortInOrder(
    sortByIndex(TYPE_ORDER)(firstType(aPrinting), firstType(bPrinting)),
    sortByValue(parseInt(aPrinting.convertedManaCost), parseInt(bPrinting.convertedManaCost)),
    sortByValue(aPrinting.name, bPrinting.name)
  );
};

export default Service.extend({
  allSets: computed(function() {
    return ObjectProxy.extend(PromiseProxyMixin).create({
      promise: fetch('https://mtgjson.com/json/AllSets.json', { cache: 'force-cache' }).then(response =>
        response.json()
      )
    });
  }),
  isLoading: readOnly('allSets.isPending'),
  cardsNamed(name) {
    const cards = [];
    Object.keys(this.get('allSets.content')).filter(setCode => {
      const found = this.get(`allSets.content.${setCode}.cards`).find(card => normalize(card.name) === normalize(name));
      if (!found || !found.multiverseId) {
        return false;
      }
      const card = copy(found, true);
      card.set = copy(this.get(`allSets.content.${setCode}`), false);
      delete card.set.cards;
      cards.push(card);
      return true;
    });
    return cards;
  },
  nameFormultiverseId(id) {
    const found = firstMatch(this.get('allSets.content'), card => card.multiverseId === id);
    return found ? found.name : null;
  }
});