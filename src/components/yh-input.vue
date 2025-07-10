<template>
  <el-input
    v-for="item in props.data"
    :key="item.model"
    :min="item.min"
    :max="item.max"
    :maxlength="item.maxlength"
    v-model.number="props.formData.trigger_args[item.model]"
    :type="item.type"
    :style="{ width: item.width }"
    :placeholder="item.placeholder"
    class="yh-input"
    @blur="(e: Event) => limitSize(e, item)">
    <template v-if="item.perfixSlot" #prefix>
      <span>{{ item.perfixSlot }}</span>
    </template>
    <template v-if="item.suffixSlot" #suffix>
      <span>{{ item.suffixSlot }}</span>
    </template>
  </el-input>
</template>
<script setup lang="ts">
  import { defineProps } from 'vue'
  
  interface InputItem {
    model: string;
    min: number;
    max: number;
    maxlength: number;
    type: string;
    width: string;
    placeholder: string;
    perfixSlot?: string;
    suffixSlot?: string;
  }

  interface FormData {
    trigger_args: {
      [key: string]: number | null | string;
    };
    [key: string]: any;
  }
  
  const props = defineProps<{
    data: InputItem[];
    formData: FormData;
  }>()
  
  //methods
  const limitSize = (e: Event, item: InputItem) => {
    const target = e.target as HTMLInputElement;
    if (target.value) {
      if(+target.value > item.max) {
        props.formData.trigger_args[item.model] = item.max;
      }
      if(+target.value < item.min) {
        props.formData.trigger_args[item.model] = item.min;
      }
      // Ensure the value is stored as a number
      if(item.type === 'number') {
        props.formData.trigger_args[item.model] = Number(props.formData.trigger_args[item.model]);
      }
    } else {
      props.formData.trigger_args[item.model] = item.type === 'number' ? 0 : null;
    }
  }
</script>
<style lang='scss' scoped>
 .yh-input {
   margin: 8px;
 }
</style>