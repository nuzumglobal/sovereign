import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { ReactiveVar } from 'meteor/reactive-var';
import { TAPi18n } from 'meteor/tap:i18n';

import { templetize, getImage } from '/imports/ui/templates/layout/templater';
import { stripHTMLfromText } from '/imports/ui/modules/utils';
import { timers } from '/lib/const';
import { Contracts } from '/imports/api/contracts/Contracts';
import { createContract } from '/imports/startup/both/modules/Contract';
import { timeCompressed } from '/imports/ui/modules/chronos';

import '/imports/ui/templates/components/decision/editor/editor.html';
import '/imports/ui/templates/components/decision/editor/editorButton.js';
import '/imports/ui/templates/components/decision/poll/poll.js';
import '/imports/ui/templates/components/decision/editor/counter.js';
import '/imports/ui/templates/components/decision/constituency/constituency.js';
import '/imports/ui/templates/components/decision/coin/coin.js';
import '/imports/ui/templates/components/decision/electorate/electorate.js';
import '/imports/ui/templates/components/decision/blockchain/blockchain.js';
import '/imports/ui/templates/components/decision/closing/closing.js';


const _keepKeyboard = () => {
  $('#toolbar-hidden-keyboard').focus();
};

const _resetDraft = () => {
  const draft = createContract();
  Session.set('draftContract', draft);
  return draft;
};

const _toggle = (key, value) => {
  const contract = Session.get('draftContract');
  contract[key] = value;
  Session.set('draftContract', contract);
};

/**
* @summary enables or disables feed and disables scrolling in mobile devices
* @param {boolean} enabled show feed
*/
function toggleFeed(enabled) {
  if (Meteor.Device.isPhone()) {
    if (!enabled) {
      $('.cast').velocity({ opacity: 0 });
      $('.agora').velocity({ opacity: 0 });
      $('#feed-bottom').velocity({ opacity: 0 });
      $('#non-editable-debate-header').velocity({ opacity: 0 });
      // $('#non-editable-reply-feed').velocity({ opacity: 0 });
      $('#non-editable-vote-feed').velocity({ opacity: 0 });
      $('#non-editable-feed').velocity({ opacity: 0 }, {
        complete: () => {
          $('#non-editable-feed').css({
            overflow: 'hidden',
            height: 0,
          });
          $('.cast').css('height', 0);
          $('#feed-bottom').css('width', 0);
          $('#non-editable-debate-header').css({ height: 0, overflow: 'hidden', marginBottom: '-10px', marginTop: '-10px', paddingTop: '0px' });
          $('#non-editable-reply-feed').css({ height: 0, overflow: 'hidden' });
          $('#non-editable-vote-feed').css({ height: 0, overflow: 'hidden' });
          $('#titleContent').focus();
        },
      });
    } else {
      $('#non-editable-debate-header').velocity({ opacity: 1 });
      $('#non-editable-reply-feed').velocity({ opacity: 1 });
      $('#non-editable-vote-feed').velocity({ opacity: 1 });
      $('#non-editable-feed').velocity({
        opacity: 1,
      }, {
        complete: () => {
          $('.cast').css('height', '60px');
          $('.agora').velocity({ opacity: 1 });
          $('#feed-bottom').css('width', '');
          $('.cast').velocity({ opacity: 1 });
          $('#feed-bottom').velocity({ opacity: 0.3 });
          $('#non-editable-debate-header').css({ height: '', overflow: '', marginBottom: '20px', marginTop: '0px', paddingTop: '3px' });
          $('#non-editable-reply-feed').css({ height: '', overflow: '' });
          $('#non-editable-vote-feed').css({ height: '', overflow: '' });
          $('#non-editable-feed').css({
            height: '',
            overflow: '',
          });
        },
      });
    }
  } else {
    $('#titleContent').focus();
  }
}

/**
* @summary animation intro of editorMode
* @param {string} contractId contract being edited to grab div
*/
const _editorFadeIn = (contractId) => {
  const originalHeight = $(`#feedItem-${contractId}`)[0].getBoundingClientRect().height;
  const tag = $('#postEditorItem');
  const diff = parseInt((tag.offset().top + $('.right').scrollTop()) - 80, 10);

  if ($('.right').scrollTop() === 0 && !$('#non-editable-vote-feed').offset()) {
    $(`#feedItem-${contractId}`).css({
      overflow: 'hidden',
      height: 0,
      marginLeft: $('.right').width(),
    });
    $(`#feedItem-${contractId}`).velocity({
      height: originalHeight,
      marginLeft: 0,
    }, {
      complete: () => {
        $(`#feedItem-${contractId}`).css({
          height: 'auto',
          overflow: 'none',
        });
        toggleFeed(false);
      },
    });
  } else {
    $('.right').animate({ scrollTop: diff }, {
      complete: () => {
        toggleFeed(false);
      },
    });
  }
};

const _editorFadeOut = () => {
  if (Meteor.Device.isPhone()) {
    Session.set('showPostEditor', false);
    delete Session.keys.draftContract;
    toggleFeed(true);
  }
};

const _threadEditor = (instance) => {
  if (instance.data.mainFeed) {
    const previous = Contracts.findOne({ _id: instance.data.replyId });
    $('#feedItem-editor').wrapAll(`<div id='thread-editor' class='vote-thread ${previous.replyId ? 'vote-thread-main' : ''} ' />`);
    $('#thread-editor').prepend("<div class='thread-sub'><div class='thread-needle thread-last'></div>");
  } else {
    $('#feedItem-editor').wrapAll("<div id='thread-editor' class='vote-thread' />");
    $('#thread-editor').prepend(`<div class='thread-sub'><div class='thread-needle ${instance.data.lastItem ? 'thread-last' : ''}'></div></div>`);
    $('#thread-editor-depth').remove();
    if (instance.data.depth > 0) {
      for (let i = 0; i < instance.data.depth; i += 1) {
        $('#thread-editor').wrapAll("<div id='thread-editor-depth' class='vote-thread' />`");
      }
    }
  }
};

const _contextCheck = (elementId, event) => {
  if (document.getElementById('card-constituency-popup')) {
    return document.getElementById('card-constituency-popup') && !document.getElementById('card-constituency-popup').contains(event.target) && document.getElementById(elementId) && !document.getElementById(elementId).contains(event.target);
  }
  if (document.getElementById('card-blockchain-popup')) {
    return document.getElementById('card-blockchain-popup') && !document.getElementById('card-blockchain-popup').contains(event.target) && document.getElementById(elementId) && !document.getElementById(elementId).contains(event.target);
  }
  if (document.getElementById('card-calendar-popup')) {
    return document.getElementById('card-calendar-popup') && !document.getElementById('card-calendar-popup').contains(event.target) && document.getElementById(elementId) && !document.getElementById(elementId).contains(event.target);
  }
  return document.getElementById(elementId) && !document.getElementById(elementId).contains(event.target);
};

Template.editor.onCreated(function () {
  const contract = Session.get('draftContract');
  Template.instance().ready = new ReactiveVar(true);
  Template.instance().contract = new ReactiveVar(contract);
  Template.instance().reply = new ReactiveVar();

  Template.instance().imageTemplate = new ReactiveVar();
  templetize(Template.instance());
});

Template.editor.onDestroyed(() => {
  $('#thread-editor').remove();
});

Template.editor.onRendered(function () {
  if (!this.data.compressed) {
    let draft;
    if (Meteor.Device.isPhone() && Session.get('draftContract')) {
      draft = Session.get('draftContract');
    } else {
      draft = _resetDraft();
    }
    if (!Meteor.Device.isPhone()) {
      if (Template.currentData().replyMode && Template.currentData().replyId) {
        Template.instance().reply.set(Contracts.findOne({ _id: this.data.replyId }));
        draft.replyId = Template.currentData().replyId;
        _threadEditor(this);
      } else {
        draft.replyId = '';
      }
    }
    Session.set('draftContract', draft);
    toggleFeed(false);

    window.addEventListener('click', function (e) {
      if (_contextCheck('feedItem-editor', e)) {
        const reset = _resetDraft();
        if (!Session.get('minimizedEditor')) {
          Session.set('minimizedEditor', true);
        }
        if (reset.replyId) {
          reset.replyId = '';
          Session.set('draftContract', reset);
        }
        $('#thread-editor-depth').remove();
        Session.set('showPostEditor', false);
      }
    });
  }
});

Template.editor.helpers({
  log() {
    return Session.get('mobileLog');
  },
  sinceDate() {
    if (Session.get('draftContract')) {
      return `${timeCompressed(Session.get('draftContract').timestamp)}`;
    }
    return '';
  },
  replyTitle() {
    const reply = Template.instance().reply.get();
    if (reply) {
      return `"${stripHTMLfromText(reply.title).substring(0, 30)}..."`;
    }
    return '';
  },
  replyURL() {
    const reply = Template.instance().reply.get();
    if (reply) {
      return reply.url;
    }
    return '#';
  },
  userWithTokenReserves() {
    // TODO - this helper might not be needed under new model, consider removing
    // if (Meteor.user() && Meteor.user().profile.wallet.reserves) {
    //   return true;
    // }
    return true;
  },
  ballotEnabled() {
    if (Session.get('draftContract')) {
      return Session.get('draftContract').ballotEnabled;
    }
    return false;
  },
  stakingEnabled() {
    if (Session.get('draftContract')) {
      return Session.get('draftContract').stakingEnabled;
    }
    return false;
  },
  pollingEnabled() {
    return Session.get('draftContract') ? Session.get('draftContract').rules.pollVoting : false;
  },
  pollList() {
    return Session.get('draftContract') ? Session.get('draftContract').poll : false;
  },
  pollId() {
    return Session.get('draftContract') ? Session.get('draftContract')._id : false;
  },
  pollSettings() {
    const draft = Session.get('draftContract');

    const quadratic = draft.rules ? draft.rules.quadraticVoting : false;
    const balance = draft.rules ? draft.rules.balanceVoting : false;
    const pollId = draft ? draft._id : false;
    const list = draft ? draft.poll : false;

    console.log('this has new poll settings');
    console.log(JSON.stringify(draft.poll));

    return {
      list,
      pollId,
      editorMode: true,
      pollTotals: 0,
      quadratic,
      balance,
    };
  },
  blockchainAddress() {
    const draft = Session.get('draftContract');
    if (draft && draft.blockchain.publicAddress) {
      return `${draft.blockchain.publicAddress.substring(0, 6)}...${draft.blockchain.publicAddress.slice(-4)}`;
    }
    return '';
  },
  blockchainFullAddress() {
    const draft = Session.get('draftContract');
    if (draft) {
      return `${draft.blockchain.publicAddress}`;
    }
    return '';
  },
  blockchainLink() {
    const draft = Session.get('draftContract');
    if (draft) {
      return `${Meteor.settings.public.web.sites.blockExplorer}/address/${draft.blockchain.publicAddress}`;
    }
    return '';
  },
  signatures() {
    if (Session.get('draftContract')) {
      return Session.get('draftContract').signatures;
    }
    return [];
  },
  draftContract() {
    if (Session.get('draftContract')) {
      return Session.get('draftContract');
    }
    return undefined;
  },
  getImage(pic) {
    return getImage(Template.instance().imageTemplate.get(), pic);
  },
  menu() {
    return [
      {
        icon: 'editor-ballot',
        label: TAPi18n.__('ballot'),
        status: () => {
          if (Session.get('draftContract')) {
            if (Session.get('draftContract').ballotEnabled) {
              return 'active';
            }
          }
          return 'enabled';
        },
        action: () => {
          if (Session.get('draftContract')) {
            _toggle('ballotEnabled', !Session.get('draftContract').ballotEnabled);
          }
        },
      },
      {
        icon: 'editor-stake',
        label: TAPi18n.__('staking'),
        status: () => {
          if (Session.get('draftContract')) {
            if (Session.get('draftContract').stakingEnabled) {
              return 'active';
            }
          }
          return 'enabled';
        },
        action: () => {
          if (Session.get('draftContract')) {
            _toggle('stakingEnabled', !Session.get('draftContract').stakingEnabled);
          }
        },
      },
      /* {
        icon: 'editor-constituency',
        label: TAPi18n.__('constituency'),
        status: () => {
          if (Session.get('draftContract')) {
            if (Session.get('draftContract').constituencyEnabled) {
              return 'active';
            }
          }
          return 'enabled';
        },
        action: () => {
          if (Session.get('draftContract')) {
            toggle('constituencyEnabled', !Session.get('draftContract').constituencyEnabled);
            displayPopup($('.section-editor')[0], 'constituency', Meteor.userId(), 'click', 'constituency-popup');
          }
        },
      },*/
    ];
  },
  adminBallotCreatorOnly() {
    if (Meteor.settings.public.app.config.interface.adminBallotCreatorOnly.active) {
      // If adminBallotCreatorOnly is active then only the user with a verified email specified in settings can create new ballots
      if (Meteor.user().emails && Meteor.user().emails[0].verified && Meteor.user().emails[0].address === Meteor.settings.public.app.config.interface.adminBallotCreatorOnly.email) {
        return false;
      }
      return true;
    }
    return false;
  },
  quadraticEnabled() {
    const draft = Session.get('draftContract');

    return draft.rules ? draft.rules.quadraticVoting : false;
  },
  balanceEnabled() {
    const draft = Session.get('draftContract');

    return draft.rules ? draft.rules.balanceVoting : false;
  },
  requiresClosing() {
    const draft = Session.get('draftContract');
    return draft.rules ? ((draft.rules.alwaysOn === false) || draft.rules.pollVoting) : false;
  },
  closingData() {
    const closing = Session.get('draftContract').closing;
    if (closing) {
      closing.alwaysOn = Session.get('draftContract').rules.alwaysOn;
      closing.editorMode = true;
    }
    return closing;
  },
  onChainVote() {
    const draft = Session.get('draftContract')
    return draft.rules ? (!draft.rules.balanceVoting && !draft.rules.quadraticVoting) : true;
  },
});

Template.editor.events({
  'click #feedItem-compressed'() {
    const draft = _resetDraft();
    draft.replyId = '';
    Session.set('draftContract', draft);
    Session.set('minimizedEditor', false);
  },
  'click #close-mobile-editor'() {
    $('#post-editor').css('display', '');
    $('#post-editor').velocity({ 'margin-top': `${$(window).height()}px` }, {
      duration: timers.ANIMATION_DURATION,
      complete: () => {
        $('#post-editor').css('display', 'none');
        Session.set('showPostEditor', false);
        window.history.back();
      },
    });
  },
  'click .mobile-section'() {
    $('#titleContent').focus();
  },
  'click #blockchain-explorer'(event) {
    event.preventDefault();
    window.open(event.currentTarget.href, '_blank');
  },
});

export const toggle = _toggle;
export const keepKeyboard = _keepKeyboard;
export const editorFadeOut = _editorFadeOut;
export const editorFadeIn = _editorFadeIn;
