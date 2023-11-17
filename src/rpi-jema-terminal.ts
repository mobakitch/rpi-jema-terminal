import { EventEmitter } from 'node:events';
import { setTimeout } from 'node:timers/promises'
import gpio, { promise as gpiop } from 'rpi-gpio';

namespace JEMATerminal {
  export type Pin = {
    pin: number;
    duration?: number | undefined;
    inverted?: boolean | undefined;
  };
  export type Options = {
    monitor: Pin;
    control: Pin;
  };
}

export default class JEMATerminal extends EventEmitter {

  private currentValue: boolean = false;

  constructor(
    private readonly options: JEMATerminal.Options
  ) {
    super();
  }

  public async setup(): Promise<void> {
    gpio.setMode(gpio.MODE_BCM);
    await gpiop.setup(this.options.monitor.pin, gpio.DIR_IN, gpio.EDGE_BOTH);
    await gpiop.setup(this.options.control.pin, gpio.DIR_OUT, gpio.EDGE_NONE);

    gpio.on('change', (channel: any, value: any) => this.onChange(channel, value));

    this.currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
  }

  private onChange(channel: any, value: any): void {
    if (channel == this.options.monitor.pin) {
      this.currentValue = this.normalizeMonitorValue(value);
      this.emit('change', this.currentValue);
    }
  }

  get value(): boolean {
    return this.currentValue;
  }

  public async get(): Promise<boolean> {
    return this.currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
  }

  public async set(value: boolean): Promise<boolean> {
    const currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
    if (currentValue != value) {
      await gpiop.write(this.options.control.pin, true);
      await setTimeout(this.options.control.duration ?? 0);
      await gpiop.write(this.options.control.pin, false);
      this.currentValue = value;
    }
    return this.currentValue;
  }

  private normalizeMonitorValue(value: boolean): boolean {
    return this.options.monitor.inverted ? !value : !!value;
  }

}
