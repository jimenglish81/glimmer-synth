import Component from '@glimmer/component';
import hbs from '@glimmer/inline-precompile';
import { setupRenderingTest } from '@glimmer/test-helpers';

const { module, test } = QUnit;

module('Component: synth-keyboard', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders correctly', async function(assert) {
    await this.render(hbs`<synth-keyboard />`);

    assert.ok(this.containerElement.querySelector('.synth-keyboard'));

    assert.equal(
      this.containerElement.querySelectorAll('.synth-key').length,
      27
    );
  });
});
