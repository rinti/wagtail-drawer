<script>
    let children = [];
    export let item;

    const fetchChildren = async () => {
        const url = item.meta.children.listing_url.replace('localhost', 'localhost:8000')
        const response = await fetch(`${url}&for_explorer=1`)

        const data = await response.json()
        children = data.items
    }

    $: hasChildren = item.meta.children && item.meta.children.count > 0;
    $: linkClasses = hasChildren ? 'icon icon-folder-inverse' : 'icon icon-doc-full-inverse';
    $: buttonClasses = hasChildren ? 'Item__Expand' : 'Item__Expand Item__Expand--Hide';
</script>

<style>
    .Item {
        padding: 10px;
    }

    .Item .icon:before {
        margin-right: 8px;
    }

    .Item__Link {
        font-size: 1rem;
        display: block;
    }

    .Item__Wrap {
        display: flex;
    }

    .Item__Expand {
        border: 0;
        font-size: 1rem;
        padding: 0;
    }

    .Item__Expand--Hide {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }
</style>

<div class="Item">
    <div class="Item__Wrap">
        <button class="{buttonClasses}">
            <span class="icon icon-arrow-right"></span>
        </button>
        <a href="#drawer" class="Item__Link {linkClasses}" on:click={() => fetchChildren(item)}>
            {item.title}
        </a>
    </div>
    {#if children.length > 0}
        {#each children as child}
            <svelte:self item={child} />
        {/each}
    {/if}
</div>
