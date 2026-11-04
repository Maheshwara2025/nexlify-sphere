<script>
  import {onMount} from 'svelte';
  import {goto} from '$app/navigation';
  onMount(()=>{void goto('/admin/contractor',{replaceState:true});});
</script>
<p class="p-6 text-sm" role="status">కాంట్రాక్టర్ ERP కి వెళ్తున్నాం... <a href="/admin/contractor">కాంట్రాక్టర్ ERP</a></p>
