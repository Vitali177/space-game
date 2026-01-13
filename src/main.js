import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ReactiveVar } from 'meteor/reactive-var';
import { check } from 'meteor/check';
import { Template } from 'meteor/templating';
import { CLIENT_EVENTS, GAME_DURATION_SECONDS, PLANETS, SERVER_EVENTS, SPAWN_TARGETS_COUNT } from './config';

export const Scores = new Mongo.Collection('scores');

if (Meteor.isClient) {
  Template.world.onCreated(function () {
    this.score = new ReactiveVar(0);
    this.timeLeft = new ReactiveVar(GAME_DURATION_SECONDS);
    this.showPopup = new ReactiveVar(false);
    this._gameTimer = null;
    this.finalScore = 0;

    this.subscribe('topScores');
  });

  Template.world.helpers({
    score () { return Template.instance().score.get(); },
    timeLeft () { return Template.instance().timeLeft.get(); },
    showPopup () { return Template.instance().showPopup.get(); },
    finalScore () { return Template.instance().finalScore || 0; },
    topScores () {
      return Scores.find({}, { sort: { score: -1, createdAt: 1 }, limit: 10 });
    }
  });

  Template.world.events({
    [CLIENT_EVENTS.MOUSEUP_TARGET] (event, instance) {
      event.preventDefault();

      const targetEl = event.currentTarget;
      const points = Number(targetEl.getAttribute('data-points') || 1);
      instance.score.set(instance.score.get() + points);

      if (targetEl.parentNode) targetEl.parentNode.removeChild(targetEl);

      // re-spawn
      if (!document.querySelectorAll('.target').length && instance.timeLeft.get() > 0) {
        spawnTargets(SPAWN_TARGETS_COUNT);
      }
    },

    [CLIENT_EVENTS.START_GAME] (event, instance) {
      event.preventDefault();
      if (instance._gameTimer) return;

      instance.score.set(0);
      instance.timeLeft.set(GAME_DURATION_SECONDS);

      spawnTargets(SPAWN_TARGETS_COUNT);

      instance._gameTimer = Meteor.setInterval(() => {
        const t = instance.timeLeft.get() - 1;
        instance.timeLeft.set(t);
        if (t <= 0) {
          Meteor.clearInterval(instance._gameTimer);
          instance._gameTimer = null;
          document.querySelectorAll('.target').forEach(el => el.remove());
          instance.finalScore = instance.score.get();
          instance.showPopup.set(true);
        }
      }, 1000);
    },

    [CLIENT_EVENTS.STOP_GAME] (event, instance) {
      event.preventDefault();
      if (instance._gameTimer) {
        Meteor.clearInterval(instance._gameTimer);
        instance._gameTimer = null;
      }
      instance.score.set(0);
      instance.timeLeft.set(0);
      document.querySelectorAll('.target').forEach(el => el.remove());
    },

    [CLIENT_EVENTS.SUBMIT_SCORE] (event, instance) {
      event.preventDefault();

      const input = instance.$('.score-name');
      if (!input || !input.length) return;

      const name = String(input.val() || '').trim().substring(0, 40);
      const score = Number(instance.score.get() || 0);

      if (!name) {
        alert('Please enter your name.');
        return;
      }

      Meteor.call(SERVER_EVENTS.INSERT_SCORES, name, score, (err) => {
        if (err) {
          console.error('Failed to save score', err);
          alert('Could not save score: ' + (err.reason || err.message));
          return;
        }
        instance.showPopup.set(false);
      });
    },

    [CLIENT_EVENTS.CLOSE_POPUP] (event, instance) {
      event.preventDefault();
      instance.showPopup.set(false);
    }
  });

  function spawnTargets (n) {
    const scene = document.querySelector('scene') || document.querySelector('x3d scene');
    if (!scene) return;

    for (let i = 0; i < n; i++) {
      const template = PLANETS[Math.floor(Math.random() * PLANETS.length)];
      const { radius, points } = template;

      const tx = (Math.random() * 20 - 10).toFixed(2);
      const ty = (Math.random() * 20 - 10).toFixed(2);
      const tz = (Math.random() * 20 - 10).toFixed(2);

      const target = document.createElement('transform');
      target.setAttribute('class', 'target');
      target.setAttribute('data-name', template.id);
      target.setAttribute('translation', `${tx} ${ty} ${tz}`);
      target.setAttribute('data-points', String(points));

      const ringRadius = parseFloat((radius * (template.ringScale || 1.4)).toFixed(2));
      const ringHeight = 0.04;
      const color = template.color;

      const inner = `
        <shape>
          <appearance><material diffuseColor="${color}"></material></appearance>
          <sphere radius="${radius}"></sphere>
        </shape>
      `;

      let ring = '';
      if (template.hasRing) {
        const rcol = template.ringColor || '1 0.7 0.4';
        ring = `
          <transform rotation="1 0 0 1.5708" translation="0 0 0">
            <shape>
              <appearance><material diffuseColor="${rcol}" transparency="0.25"></material></appearance>
              <cylinder radius="${ringRadius}" height="${ringHeight}"></cylinder>
            </shape>
          </transform>
        `;
      }

      target.innerHTML = inner + ring;
      scene.appendChild(target);
    }
  }

  Template.world.onRendered(function () {
    const inst = this;

    // simple continuous rotation + small wobble/pulse for disk & glow
    let last = performance.now();
    let ang = 0;

    function animate (now) {
      const dt = (now - last) / 1000;
      last = now;
      ang += dt * 0.6;

      const outer = document.getElementById('bh-disk-outer');
      const mid = document.getElementById('bh-disk-mid');
      const inner = document.getElementById('bh-disk-inner');

      if (outer) outer.setAttribute('rotation', `0 1 0 ${ang * 0.6}`);
      if (mid) mid.setAttribute('rotation', `0 1 0 ${-ang * 1.2}`);
      if (inner) inner.setAttribute('rotation', `0 1 0 ${ang * 2.2}`);

      const lens = document.getElementById('bh-lens');
      if (lens) lens.setAttribute('rotation', `0 1 0 ${Math.sin(now / 1400) * 0.02}`);

      inst._bhAnimFrame = requestAnimationFrame(animate);
    }

    inst._bhAnimFrame = requestAnimationFrame(animate);
  });

  Template.world.onDestroyed(function () {
    const inst = this;
    if (inst._bhAnimFrame) {
      cancelAnimationFrame(inst._bhAnimFrame);
      inst._bhAnimFrame = null;
    }
  });
}

if (Meteor.isServer) {
  Meteor.publish('topScores', function () {
    return Scores.find({}, { sort: { score: -1, createdAt: 1 }, limit: 10 });
  });

  Meteor.methods({
    async [SERVER_EVENTS.INSERT_SCORES] (name, score) {
      check(name, String);
      check(score, Number);

      if (!name.length || name.length > 40) {
        throw new Meteor.Error('invalid-name', 'Name must be 1-40 characters');
      }

      if (score < 0) {
        throw new Meteor.Error('invalid-score', 'Score must be >= 0');
      }

      const id = await Scores.insertAsync({
        name,
        score,
        createdAt: new Date()
      });

      return id;
    }
  });
}
