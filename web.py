from __future__ import annotations

from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, cast

try:
    from astrbot.api import logger
except Exception:  # pragma: no cover
    import logging
    logger = logging.getLogger(__name__)

try:
    from quart import jsonify as quart_jsonify
    from quart import request as quart_request_obj
except ImportError:  # pragma: no cover
    quart_jsonify = None
    quart_request_obj = None

from .page_service import PermissionControllerPageService

PLUGIN_NAME = "astrbot_plugin_permission_controller"


class PermissionControllerWebController:
    def __init__(self, context: Any, config: Any):
        self.context = context
        self.service = PermissionControllerPageService(Path(__file__).resolve().parent, config)

    def register_routes(self) -> None:
        routes = [
            ("/ping", self.page_ping, ["GET"], "Permission controller page ping"),
            ("/settings/bootstrap", self.page_bootstrap, ["GET"], "Load permission controller settings"),
            ("/settings/config", self.page_update_config, ["POST"], "Update permission controller settings"),
        ]
        for path, handler, methods, desc in routes:
            self.context.register_web_api(f"/{PLUGIN_NAME}{path}", self._wrap_handler(handler), methods, desc)

    @staticmethod
    def _check_quart_available() -> None:
        if quart_jsonify is None or quart_request_obj is None:
            raise RuntimeError("Web framework is unavailable")

    @staticmethod
    def _jsonify(payload: dict[str, Any]):
        PermissionControllerWebController._check_quart_available()
        return cast(Callable[[dict[str, Any]], Any], quart_jsonify)(payload)

    @staticmethod
    def _request():
        PermissionControllerWebController._check_quart_available()
        return cast(Any, quart_request_obj)

    def _wrap_handler(self, handler: Callable[[], Awaitable]) -> Callable[[], Awaitable]:
        async def wrapped():
            self._check_quart_available()
            try:
                return await handler()
            except ValueError as exc:
                return self._jsonify({"ok": False, "message": str(exc)}), 400
            except Exception as exc:
                logger.exception("Permission controller page request failed")
                return self._jsonify({"ok": False, "message": str(exc)}), 500
        wrapped.__name__ = handler.__name__
        return wrapped

    async def page_ping(self):
        return self._jsonify({"ok": True, "message": "pong"})

    async def page_bootstrap(self):
        return self._jsonify({"ok": True, "data": await self.service.get_bootstrap_payload()})

    async def page_update_config(self):
        payload = await self._request().get_json(force=True, silent=True) or {}
        config = payload.get("config", payload)
        data = await self.service.update_config(config)
        return self._jsonify({"ok": True, "message": "配置已保存，部分运行时拦截规则可能需要重载插件后完全生效。", "data": data})
