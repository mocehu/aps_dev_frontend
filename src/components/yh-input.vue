<template>
  <div class="yh-inputs">
    <div v-for="item in props.data" :key="item.name" class="yh-input">
      <a-input-number
        v-if="item.type === 'number'"
        v-model:value="props.formData.trigger_args[item.name]"
        :placeholder="item.placeholder"
        :min="0"
        :max="999"
        @blur="(e: FocusEvent) => limitSize(e, item)"
      >
        <template #addonAfter>{{ item.label }}</template>
      </a-input-number>
      <a-input
        v-else
        v-model:value="props.formData.trigger_args[item.name]"
        :placeholder="item.placeholder"
        @blur="(e: FocusEvent) => limitSize(e, item)"
      >
        <template #addonAfter>{{ item.label }}</template>
      </a-input>
      <div class="input-description">{{ item.description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface InputItem {
    name: string;
    type: string;
    label: string;
    description: string;
    placeholder: string;
    triggerArgs: boolean;
  }

  interface FormData {
    trigger_args: {
      [key: string]: number | string | null;
    };
    [key: string]: any;
  }
  
  const props = defineProps<{
    data: InputItem[];
    formData: FormData;
  }>()
  
  //methods
  const limitSize = (e: FocusEvent, item: InputItem) => {
    const target = e.target as HTMLInputElement;
    if (target.value) {
      if (item.type === 'number') {
        const val = Number(target.value);
        if (isNaN(val)) {
          props.formData.trigger_args[item.name] = 0;
        } else {
          props.formData.trigger_args[item.name] = Math.max(0, Math.min(999, val));
        }
      }
    } else {
      props.formData.trigger_args[item.name] = item.type === 'number' ? 0 : '';
    }
  }
</script>

<style lang='scss' scoped>
.yh-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  
  .yh-input {
    width: calc(50% - 8px);
    
    .input-description {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      margin-top: 4px;
    }
  }
}

@media (max-width: 768px) {
  .yh-inputs .yh-input {
    width: 100%;
  }
}
</style>