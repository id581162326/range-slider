import * as A from 'fp-ts/Array';
import {pipe} from 'fp-ts/function';

import * as H from '../../globals/helpers';

import Model from './namespace';
import * as D from './defaults';

export default class implements Model.Interface {
  public props: Model.Props = D.props;

  public state: Model.State = D.state;

  // methods

  public setProps(props: Model.Props) {
    this.validateProps(props);

    this.props = props;
  }

  public setState(state: Model.State) {
    this.state = state;
  }

  public setListener(listener: Model.Listener) {
    this.listener = listener;
  }

  public updateState(action: Model.StateActions) {
    switch (action.type) {
      case 'UPDATE_CURRENTS': {
        this.updateCurrents(action.currents);

        break;
      }
    }
  }

  // variables

  private listener: Model.Listener = D.listener;

  // update logic

  private updateCurrents: (xs: Model.State['currents']) => void = (currents) => {
    const corrected = this.correctCurrents(currents);

    this.state = {...this.state, currents: corrected};

    this.listener.update({type: 'CURRENTS_UPDATED', currents: corrected});
  };

  // correct currents logic

  private correctCurrents: (xs: number[]) => number[] = (newCurrents) => {
    const {currents} = this.state;

    const changed: (i: number, x: number) => boolean = (i, current) => pipe(currents, H.nthOrNone(i, NaN)) !== current;

    const correct: (i: number, x: number) => number = (i, current) => changed(i, current)
      ? pipe(current, this.correctToStep, this.correctToMargin(i), this.correctToEnds) : current;

    return (A.mapWithIndex(correct)(newCurrents));
  };

  private correctToStep: (x: number) => number = (current) => {
    const {step} = this.props;

    return (pipe(current, H.div(step), Math.round, H.mult(step)));
  };

  private correctToMargin: (i: number) => (x: number) => number = (i) => (current) => {
    const {margin} = this.props;

    const {currents} = this.state;

    const prev = H.nthOrNone(H.dec(i), NaN)(currents);

    const next = H.nthOrNone(H.inc(i), NaN)(currents);

    const hasPrevCond = !isNaN(prev) && H.sub(prev)(current) < margin;

    const hasNextCond = !isNaN(next) && H.sub(current)(next) < margin;

    if (hasPrevCond) {
      return (H.add(margin)(prev));
    }

    if (hasNextCond) {
      return (H.sub(margin)(next));
    }

    return (current);
  };

  private correctToEnds: (x: number) => number = (current) => {
    const {min, max} = this.props;

    if (current < min) {
      return (min);
    }

    if (current > max) {
      return (max);
    }

    return (current);
  };

  // validate props logic

  private invalidPropError = H.throwError('Invalid prop');

  private validateProps: (p: Model.Props) => void = (props) => {
    this.validateRange(props);

    this.validateStep(props);

    this.validateMargin(props);
  };

  private validateRange: (p: Model.Props) => void = (props) => {
    const {min, max} = props;

    if (min < 0) {
      this.invalidPropError('Min value must not be less than zero');
    }

    if (max <= 0) {
      this.invalidPropError('Max value must not be less than zero or equal to it');
    }

    if (max <= min) {
      this.invalidPropError('Max value must not be less than min value or equal to it');
    }
  };

  private validateStep: (p: Model.Props) => void = (props) => {
    const {min, max, step} = props;

    if (step > H.sub(min)(max)) {
      this.invalidPropError('Step value must not be more than range value');
    }

    if (step < 0) {
      this.invalidPropError('Step value must not be less than zero');
    }
  };

  private validateMargin: (p: Model.Props) => void = (props) => {
    const {min, max, margin} = props;

    if (margin > H.sub(min)(max)) {
      this.invalidPropError('Margin value must not be more than range value');
    }

    if (margin < 0) {
      this.invalidPropError('Margin value must not be less than zero');
    }
  };
}