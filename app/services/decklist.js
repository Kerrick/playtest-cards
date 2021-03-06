import Ember from 'ember';
import { parse } from 'mtg-tools/utils/deck-parser';

const { inject, computed, isEmpty } = Ember;

export default Ember.Service.extend(Ember.Evented, {
  mtg: inject.service(),
  raw: Ember.computed('_raw', {
    get() {
      return this.get('_raw');
    },
    set(key, value) {
      this.set('_raw', value);
      Ember.run.next(() => this.trigger('rawUpdated', value));
      return value;
    }
  }),
  _raw: '',
  toCard(card) {
    return {
      count: card.number,
      name: card.name,
      printings: this.get('mtg').cardsNamed(card.name).sort((a, b) => {
        if (a.set.type !== b.set.type) {
          if (a.set.type === 'masterpiece') {
            return 1;
          }
          else if (b.set.type === 'masterpiece') {
            return -1;
          }
        }
        if (a.set.onlineOnly === b.set.onlineOnly) {
          if (a.set.releaseDate < b.set.releaseDate) {
            return 1;
          }
          else if (a.set.releaseDate > b.set.releaseDate) {
            return -1;
          }
          else {
            return 0;
          }
        }
        else if (a.set.onlineOnly) {
          return 1;
        }
        else if (b.set.onlineOnly) {
          return -1;
        }
        else {
          return 0;
        }
      })
    };
  },
  decklist: computed('raw', function() {
    return parse(this.get('raw'));
  }),
  mtgJsonCards: computed('mtgJsonMaindeckCards', 'mtgJsonSideboardCards', function() {
    return this.get('mtgJsonMaindeckCards')
      .concat(this.get('mtgJsonSideboardCards'))
    ;
  }),
  mtgJsonMaindeckCards: computed('decklist', function() {
    return this.get('decklist.cards')
      .map(x => this.toCard(x))
      .reject(card => isEmpty(card.printings))
    ;
  }),
  mtgJsonSideboardCards: computed('decklist', function() {
    return this.get('decklist.sideboard')
      .map(x => this.toCard(x))
      .reject(card => isEmpty(card.printings))
    ;
  }),
  desiredCards: computed.readOnly('mtgJsonCards'),
  desiredCardsWithoutBasicLands: computed('desiredCards', function() {
    return this.get('desiredCards').reject(card => {
      return card.printings[0].types.contains('Land') &&
        card.printings[0].supertypes &&
        card.printings[0].supertypes.contains('Basic')
      ;
    });
  }),
  problemCards: computed('mtgJsonCards.[]', function() {
    const decklist = this.get('decklist');
    return decklist.cards.concat(decklist.sideboard)
      .map(x => this.toCard(x))
      .filter(card => isEmpty(card.printings))
    ;
  })
});
